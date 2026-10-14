// Claude Code 훅이 보내는 JSON을 받아 에이전트 상태(AgentSnapshot)로 바꾼다.
// 순수 함수만 둔다: 같은 입력이면 같은 결과. 파일 읽기 같은 일은 index.ts가 한다.
import { basename, relative, isAbsolute } from 'node:path';
import { STUCK_FAIL_STREAK, type Activity, type AgentSnapshot, type MailRecord, type TodoItem } from '../shared/protocol.ts';
import { PHRASES, cleanPrompt, firstParagraph, humanizeTool, mailSummary, messageSent, requestReceived } from './humanize.ts';
import { extractLinks } from './links.ts';
import type { AgentLink, LocalText } from '../shared/protocol.ts';

export interface ClaudeHookPayload {
  session_id: string;
  hook_event_name: string;
  cwd?: string;
  transcript_path?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  tool_use_id?: string;
  message?: string;
  source?: string;
  /** UserPromptSubmit 훅이 주는 사람의 요청 */
  prompt?: string;
  /** 우리가 붙이는 값: 'AssistantText' 이벤트에 실리는 에이전트의 설명 글 */
  assistant_text?: string;
  /** 팀원·하위 에이전트 안에서 난 이벤트면 붙는다 */
  agent_id?: string;
  agent_type?: string;
  teammate_name?: string;
  task_id?: string;
  task_subject?: string;
  /** 우리가 붙이는 값: 대화 기록에 남은 도구 실행 결과 글 (링크를 찾는 데 쓴다) */
  tool_output_text?: string;
  /** 우리가 붙이는 값: 대화 기록에서 읽은 이벤트의 실제 시각(ms). 훅으로 온 이벤트에는 없다. */
  observed_at?: number;
  /** 우리가 붙이는 값: 대화 기록에서 읽은 세션 제목 */
  session_title?: string;
}

const MAX_MAIL_RECORDS = 30;
const MAX_RECENT = 12;
const MAX_LINKS = 12;
const MAX_MESSAGES = 30;
const MAX_TEAM_TASKS = 40;
const SUBAGENT_TOOLS = new Set(['Task', 'Agent']);
/** 이름을 붙인 Agent 호출은 팀원을 만든다. 팀원은 회의실에 따로 나오므로 리더의 인턴으로 세지 않는다. */
const isTeammateSpawn = (input: Record<string, unknown>) => typeof input.name === 'string' || typeof input.team_name === 'string';
const RESEARCH_TOOLS = new Set(['WebSearch', 'WebFetch']);

export function isClaudeHookPayload(value: unknown): value is ClaudeHookPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.session_id === 'string' && typeof v.hook_event_name === 'string';
}

export function createAgent(payload: ClaudeHookPayload, now: number): AgentSnapshot {
  return {
    id: payload.session_id,
    tool: 'claude-code',
    cwd: payload.cwd ?? '',
    title: null,
    parentId: null,
    role: null,
    memberName: null,
    activity: 'waiting-user',
    detail: '',
    summary: PHRASES.waitingForInstruction,
    request: null,
    narration: null,
    recent: [],
    links: [],
    messages: [],
    teamTasks: [],
    contextUsedRatio: null,
    todos: [],
    subagents: [],
    mail: [],
    failStreak: 0,
    startedAt: now,
    updatedAt: now
  };
}

/** 훅 이벤트 하나를 반영한 새 상태를 돌려준다. prev는 바꾸지 않는다. */
export function applyClaudeHook(prev: AgentSnapshot | undefined, payload: ClaudeHookPayload, now: number): AgentSnapshot {
  const base = prev ?? createAgent(payload, now);
  const next: AgentSnapshot = { ...base, cwd: payload.cwd ?? base.cwd, title: payload.session_title ?? base.title, updatedAt: now };

  switch (payload.hook_event_name) {
    case 'SessionStart':
      return payload.source === 'compact'
        ? { ...next, activity: 'thinking', detail: '', summary: PHRASES.thinkingAfterCompact }
        : { ...next, activity: 'waiting-user', detail: '', summary: PHRASES.waitingForInstruction };
    case 'UserPromptSubmit': {
      const request = payload.prompt ? cleanPrompt(payload.prompt) : next.request;
      return { ...withRecent(next, now, request ? requestReceived(request) : PHRASES.newRequest), activity: 'thinking', detail: '', summary: PHRASES.readingRequest, request, narration: null };
    }
    case 'AssistantText': {
      const narration = payload.assistant_text ? firstParagraph(payload.assistant_text) : '';
      const withLinks = withNewLinks(next, extractLinks(payload.assistant_text ?? '', now));
      return narration ? { ...withLinks, narration } : withLinks;
    }
    case 'PreToolUse':
      return applyToolStart(next, payload, now);
    case 'PostToolUse':
      // 명령 결과는 로그·문서 내용이 섞여 링크가 많으므로, 명령 실행(Bash) 결과의 PR·로컬 서버 주소만 받는다
      return applyToolEnd(withNewLinks(next, payload.tool_name === 'Bash' ? extractLinks(toolOutputText(payload), now).filter((l) => l.kind !== 'web') : []), payload, didToolFail(payload.tool_response));
    case 'PostToolUseFailure':
      return applyToolEnd(next, payload, true);
    case 'Notification':
      return applyNotification(next, payload.message ?? '');
    case 'Stop':
      return { ...withRecent(next, now, PHRASES.turnFinished), activity: 'waiting-user', detail: '', summary: PHRASES.waitingForInstruction };
    case 'SubagentStart':
      return { ...withRecent(next, now, PHRASES.joinedTeam), activity: 'thinking', summary: PHRASES.joinedTeam };
    case 'TeammateIdle':
      return { ...withRecent(next, now, PHRASES.teammateIdle), activity: 'waiting-user', detail: '', summary: PHRASES.teammateIdle };
    case 'TaskCreated':
    case 'TaskCompleted':
      return withTeamTask(next, payload, now);
    case 'SubagentStop':
      return { ...next, subagents: next.subagents.slice(1) };
    case 'PreCompact':
      return { ...withRecent(next, now, PHRASES.compactedLog), activity: 'compacting', detail: '', summary: PHRASES.compacting };
    case 'SessionEnd':
      return { ...next, activity: 'ended', detail: '', summary: PHRASES.sessionEnded, subagents: [] };
    default:
      return next;
  }
}

/** 새로 찾은 링크를 앞에 붙인다. 같은 주소는 한 번만 (새 시각으로 앞으로 옮긴다). */
function withNewLinks(agent: AgentSnapshot, found: AgentLink[]): AgentSnapshot {
  if (!found.length) return agent;
  const fresh = new Set(found.map((l) => l.url));
  return { ...agent, links: [...found, ...agent.links.filter((l) => !fresh.has(l.url))].slice(0, MAX_LINKS) };
}

/** 훅의 tool_response(형태가 도구마다 다름) 또는 대화 기록의 결과 글에서 텍스트만 모은다 */
function toolOutputText(payload: ClaudeHookPayload): string {
  if (payload.tool_output_text) return payload.tool_output_text;
  const r = payload.tool_response;
  if (typeof r === 'string') return r;
  if (typeof r !== 'object' || r === null) return '';
  const o = r as Record<string, unknown>;
  return ['stdout', 'output', 'content', 'result', 'text'].map((k) => (typeof o[k] === 'string' ? (o[k] as string) : '')).join('\n');
}

/** 팀 할 일 생성·완료를 리더 상태에 반영한다 */
function withTeamTask(agent: AgentSnapshot, payload: ClaudeHookPayload, now: number): AgentSnapshot {
  const id = payload.task_id ?? `${now}`;
  const existing = agent.teamTasks.find((t) => t.id === id);
  const status = payload.hook_event_name === 'TaskCompleted' ? 'done' : existing?.status ?? 'open';
  const task = { id, subject: payload.task_subject ?? existing?.subject ?? id, owner: payload.teammate_name ?? existing?.owner ?? null, status, at: now } as const;
  return { ...agent, teamTasks: [task, ...agent.teamTasks.filter((t) => t.id !== id)].slice(0, MAX_TEAM_TASKS) };
}

function withRecent(agent: AgentSnapshot, at: number, text: LocalText): AgentSnapshot {
  if (agent.recent[0]?.text.ko === text.ko) return agent;
  return { ...agent, recent: [{ at, text }, ...agent.recent].slice(0, MAX_RECENT) };
}

function applyToolStart(prev: AgentSnapshot, payload: ClaudeHookPayload, now: number): AgentSnapshot {
  const toolName = payload.tool_name ?? '';
  const input = payload.tool_input ?? {};
  const detail = describeTool(toolName, input, prev.cwd);
  const summary = humanizeTool(toolName, input, prev.cwd);
  const agent = { ...withRecent(prev, now, summary), summary };

  const mail = classifyMailTool(toolName);
  if (mail) {
    const record: MailRecord = {
      id: payload.tool_use_id ?? `${agent.id}-${now}`,
      at: now,
      direction: mail.direction,
      channel: mail.channel,
      target: pickText(input, ['channel', 'channel_name', 'channel_id', 'to', 'recipient', 'query', 'q']),
      preview: truncate(pickText(input, ['text', 'message', 'body', 'subject', 'content']), 80)
    };
    const activity: Activity = mail.direction === 'sent' ? 'mail-send' : 'mail-read';
    const summary = mailSummary(mail.channel, record.target, mail.direction);
    return { ...withRecent(prev, now, summary), summary, activity, detail, mail: [record, ...agent.mail].slice(0, MAX_MAIL_RECORDS) };
  }
  if (toolName === 'SendMessage') {
    const to = pickText(input, ['to', 'recipient', 'teammate', 'teammate_name', 'target']) || '*';
    const text = truncate(pickText(input, ['message', 'content', 'text', 'summary']), 200);
    const message = { id: payload.tool_use_id ?? `${agent.id}-msg-${now}`, to, text, at: now };
    return { ...agent, activity: 'working', summary: messageSent(to), messages: [message, ...agent.messages.filter((m) => m.id !== message.id)].slice(0, MAX_MESSAGES) };
  }
  if (SUBAGENT_TOOLS.has(toolName) && !isTeammateSpawn(input)) {
    const label = pickText(input, ['subagent_type', 'description']) || 'subagent';
    const sub = { id: payload.tool_use_id ?? `${agent.id}-sub-${now}`, label, startedAt: now };
    return { ...agent, activity: 'working', detail, subagents: [...agent.subagents, sub] };
  }
  if (toolName === 'TodoWrite') {
    return { ...agent, activity: 'working', detail, todos: readTodos(input) };
  }
  if (RESEARCH_TOOLS.has(toolName)) {
    return { ...agent, activity: 'researching', detail };
  }
  if (toolName === 'Bash' && input.run_in_background === true) {
    return { ...agent, activity: 'background', detail };
  }
  return { ...agent, activity: agent.activity === 'stuck' ? 'stuck' : 'working', detail };
}

function applyToolEnd(agent: AgentSnapshot, payload: ClaudeHookPayload, failed: boolean): AgentSnapshot {
  // 실패 반복은 명령 실행(테스트·빌드)만 센다. 파일 읽기 실패까지 세면 너무 쉽게 'stuck'이 된다.
  if (payload.tool_name !== 'Bash') return { ...agent, activity: agent.activity === 'stuck' ? 'stuck' : 'thinking' };
  const failStreak = failed ? agent.failStreak + 1 : 0;
  const activity: Activity = failStreak >= STUCK_FAIL_STREAK ? 'stuck' : 'thinking';
  return { ...agent, failStreak, activity };
}

function applyNotification(agent: AgentSnapshot, message: string): AgentSnapshot {
  const lower = message.toLowerCase();
  if (lower.includes('permission')) return { ...agent, activity: 'waiting-permission', detail: message, summary: PHRASES.waitingPermission };
  if (lower.includes('waiting for your input')) return { ...agent, activity: 'waiting-user', detail: '', summary: PHRASES.waitingForInstruction };
  return agent;
}

export function didToolFail(response: unknown): boolean {
  if (typeof response !== 'object' || response === null) return false;
  const r = response as Record<string, unknown>;
  if (r.is_error === true || r.interrupted === true) return true;
  const exitCode = r.exit_code ?? r.exitCode;
  return typeof exitCode === 'number' && exitCode !== 0;
}

/** Slack·메일 계열 MCP 도구면 통로 이름과 방향을, 아니면 null을 돌려준다. */
export function classifyMailTool(toolName: string): { channel: string; direction: MailRecord['direction'] } | null {
  if (!toolName.startsWith('mcp__')) return null;
  const lower = toolName.toLowerCase();
  const channel = lower.includes('slack') ? 'Slack'
    : lower.includes('gmail') ? 'Gmail'
    : lower.includes('outlook') ? 'Outlook'
    : /(^|_)e?mail/.test(lower) ? '메일'
    : null;
  if (!channel) return null;
  const action = lower.slice(lower.lastIndexOf('__') + 2);
  if (/(send|post|reply|draft|write|create_message)/.test(action)) return { channel, direction: 'sent' };
  if (/(read|search|get|list|fetch|history|conversation)/.test(action)) return { channel, direction: 'read' };
  return null;
}

export function describeTool(toolName: string, input: Record<string, unknown>, cwd: string): string {
  // MCP 도구 이름(mcp__서버__도구)은 "서버:도구"로 줄여 보여 준다
  if (toolName.startsWith('mcp__')) {
    const [, server = '', tool = ''] = toolName.split('__');
    return `${server}:${tool}`;
  }
  const path = pickText(input, ['file_path', 'notebook_path', 'path']);
  if (path) return `${toolName} ${shortPath(path, cwd)}`;
  const command = pickText(input, ['command']);
  if (command) return `${toolName} ${truncate(command, 60)}`;
  const target = pickText(input, ['pattern', 'query', 'url', 'description', 'subagent_type']);
  return target ? `${toolName} ${truncate(target, 60)}` : toolName;
}

function shortPath(path: string, cwd: string): string {
  if (cwd && isAbsolute(path)) {
    const rel = relative(cwd, path);
    if (!rel.startsWith('..')) return rel;
  }
  return basename(path);
}

function readTodos(input: Record<string, unknown>): TodoItem[] {
  const raw = input.todos;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): TodoItem[] => {
    if (typeof item !== 'object' || item === null) return [];
    const t = item as Record<string, unknown>;
    const status = t.status === 'in_progress' || t.status === 'completed' ? t.status : 'pending';
    return typeof t.content === 'string' ? [{ content: t.content, status }] : [];
  });
}

function pickText(input: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = input[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === 'string')) return v.join(', ');
  }
  return '';
}

function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, ' ');
  return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
}
