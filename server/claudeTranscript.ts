// Claude Code 대화 기록(JSONL) 한 줄을 훅 이벤트와 같은 모양으로 바꾼다.
// 훅을 설치하지 않았거나, 훅을 설치하기 전에 시작한 세션도 보여주기 위해서다.
// 기록에는 "권한 승인 대기"가 남지 않으므로 그 상태는 훅으로만 알 수 있다.
import type { ClaudeHookPayload } from './claudeHook.ts';

interface ContentBlock { type?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; is_error?: boolean; text?: string; content?: unknown }

const MAX_OUTPUT_TEXT = 20_000;

/** 도구 결과 content는 글자이거나 [{type:'text', text}] 목록이다 */
function resultText(content: unknown): string {
  if (typeof content === 'string') return content.slice(0, MAX_OUTPUT_TEXT);
  if (!Array.isArray(content)) return '';
  return content.map((p) => (typeof p === 'object' && p && typeof (p as ContentBlock).text === 'string' ? (p as ContentBlock).text : '')).join('\n').slice(0, MAX_OUTPUT_TEXT);
}
interface TranscriptEntry {
  type?: string;
  subtype?: string;
  sessionId?: string;
  cwd?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  timestamp?: string;
  customTitle?: string;
  agentName?: string;
  agentId?: string;
  message?: { content?: string | ContentBlock[]; stop_reason?: string | null };
}

const SUBAGENT_TOOLS = new Set(['Task', 'Agent']);

/** 에이전트 팀원 기록 파일(<리더 세션>/subagents/agent-*.jsonl) 옆 meta.json에서 읽은 팀원 정보 */
export interface TeammateInfo { name: string; agentType: string }

/** 리더가 팀원에게 보낸 말은 팀원 기록에 이 태그로 감싸여 사람 말처럼 들어온다 */
const TEAMMATE_MESSAGE_RE = /^<teammate-message\b[^>]*>([\s\S]*?)<\/teammate-message>\s*$/;

/** 한 세션 기록을 읽는 동안 "어떤 tool_use id가 어떤 도구였는지" 기억한다. 결과 줄에는 도구 이름이 없기 때문이다. */
export class TranscriptReader {
  private readonly toolNames = new Map<string, string>();
  /** 기록 중간중간 'custom-title' 줄로 남는 세션 제목. 이후 이벤트마다 실어 보낸다. */
  private title: string | undefined;
  private readonly transcriptPath: string;
  /** 팀원 기록이면 팀원 정보. 이벤트마다 팀원 표시를 붙여 리더 아래 팀원으로 가게 한다. */
  private readonly teammate: TeammateInfo | null;

  constructor(transcriptPath: string, teammate: TeammateInfo | null = null) {
    this.transcriptPath = transcriptPath;
    this.teammate = teammate;
  }

  /** 기록 한 줄 → 훅 이벤트 0개 이상 */
  toHookEvents(line: string): ClaudeHookPayload[] {
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line) as TranscriptEntry;
    } catch {
      return [];
    }
    // 팀원 기록은 줄마다 isSidechain이 붙어 있다. 보통 하위 에이전트의 곁가지 줄만 버린다.
    if (!entry.sessionId || (entry.isSidechain && !this.teammate)) return [];
    if (entry.type === 'custom-title' || entry.type === 'agent-name') {
      this.title = entry.customTitle ?? entry.agentName ?? this.title;
      return [];
    }
    const observedAt = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
    const member = this.teammate ? { agent_id: entry.agentId ?? this.teammate.name, agent_type: this.teammate.agentType, teammate_name: this.teammate.name } : {};
    const base = { session_id: entry.sessionId, cwd: entry.cwd, transcript_path: this.transcriptPath, observed_at: Number.isNaN(observedAt) ? undefined : observedAt, session_title: this.title, ...member };

    if (entry.type === 'system' && entry.subtype === 'compact_boundary') {
      return [{ ...base, hook_event_name: 'PreCompact' }];
    }
    const content = entry.message?.content;
    if (entry.type === 'assistant' && Array.isArray(content)) {
      const toolUses = content.filter((b) => b.type === 'tool_use' && b.name);
      const said = content.filter((b) => b.type === 'text' && b.text?.trim()).map((b) => b.text!).join('\n\n');
      const events: ClaudeHookPayload[] = said ? [{ ...base, hook_event_name: 'AssistantText', assistant_text: said }] : [];
      events.push(...toolUses.map((b) => {
        if (b.id) this.toolNames.set(b.id, b.name!);
        return { ...base, hook_event_name: 'PreToolUse', tool_name: b.name, tool_use_id: b.id, tool_input: asRecord(b.input) };
      }));
      if (!toolUses.length && entry.message?.stop_reason === 'end_turn') events.push({ ...base, hook_event_name: 'Stop' });
      return events;
    }
    if (entry.type === 'user' && Array.isArray(content)) {
      return content.filter((b) => b.type === 'tool_result').flatMap((b) => {
        const toolName = (b.tool_use_id && this.toolNames.get(b.tool_use_id)) ?? '';
        const end: ClaudeHookPayload = { ...base, hook_event_name: 'PostToolUse', tool_name: toolName, tool_use_id: b.tool_use_id, tool_response: { is_error: b.is_error === true }, tool_output_text: resultText(b.content) };
        return SUBAGENT_TOOLS.has(toolName) ? [end, { ...base, hook_event_name: 'SubagentStop' }] : [end];
      });
    }
    const teammateMessage = this.teammate && typeof content === 'string' ? TEAMMATE_MESSAGE_RE.exec(content.trim()) : null;
    if (entry.type === 'user' && teammateMessage) {
      return [{ ...base, hook_event_name: 'UserPromptSubmit', prompt: teammateMessage[1].trim() }];
    }
    if (entry.type === 'user' && typeof content === 'string' && !entry.isMeta && !content.startsWith('<')) {
      return [{ ...base, hook_event_name: 'UserPromptSubmit', prompt: content }];
    }
    return [];
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
