// 에이전트 표시 이름. 사용자가 바꾼 이름은 "도구 + 작업 폴더" 기준으로 이 브라우저에 저장한다.
// 그래서 같은 폴더에서 Claude Code를 다시 띄워도 같은 이름으로 나온다.
import type { AgentSnapshot, ToolKind } from '../../shared/protocol.ts';

const STORAGE_KEY = 'wamad.names';
/** 이름을 바꾸기 전(Agent Office)에 저장한 값 */
const LEGACY_STORAGE_KEY = 'agent-office.names';
export const MAX_NAME_LENGTH = 12;

export const TOOL_LABEL: Record<ToolKind, string> = { 'claude-code': 'Claude', codex: 'Codex', gemini: 'Gemini' };
export const TOOL_FULL_LABEL: Record<ToolKind, string> = { 'claude-code': 'Claude Code', codex: 'Codex CLI', gemini: 'Gemini CLI' };

let saved: Record<string, string> = readSaved();

function readSaved(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** 이름·꾸미기를 기억하는 기준: 같은 도구 + 같은 작업 폴더면 같은 에이전트로 본다. 팀원은 팀원 이름까지 본다. */
export const profileKey = (agent: AgentSnapshot) => `${agent.tool}:${agent.cwd}${agent.parentId ? `:${agent.memberName ?? agent.role}` : ''}`;

const ROLE_LABEL: Record<string, string> = { po: 'PO', pm: 'PM', design: 'Design', fe: 'FE', be: 'BE', infra: 'Infra', qa: 'QA', data: 'Data' };
export const roleLabel = (role: string | null) => (role ? ROLE_LABEL[role] ?? role : '');

export const folderName = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;

/**
 * 저장한 이름이 없으면 세션 제목. 제목도 없으면: 같은 도구가 하나뿐이면 도구 이름, 여러 개면 작업 폴더 이름(소품으로 도구는 구분된다).
 * 같은 이름이 겹치면 먼저 시작한 순서대로 뒤에 2, 3을 붙인다.
 */
export function displayName(agent: AgentSnapshot, all: Iterable<AgentSnapshot>): string {
  const agents = [...all].sort((a, b) => a.startedAt - b.startedAt);
  const baseName = (a: AgentSnapshot) => {
    const custom = saved[profileKey(a)];
    if (custom) return custom;
    if (a.parentId) {
      // 팀원: 역할 이름, 팀원 이름이 역할과 다르면 함께
      const role = roleLabel(a.role);
      const named = a.memberName && a.memberName.toLowerCase() !== a.role ? a.memberName : '';
      return [role, named].filter(Boolean).join(' · ') || 'teammate';
    }
    if (a.title) return a.title;
    return agents.filter((b) => b.tool === a.tool).length > 1 ? folderName(a.cwd) : TOOL_LABEL[a.tool];
  };
  const mine = baseName(agent);
  const sameNameBefore = agents.slice(0, agents.indexOf(agent)).filter((a) => baseName(a) === mine).length;
  return sameNameBefore > 0 ? `${mine} ${sameNameBefore + 1}` : mine;
}

/** 빈 이름을 주면 기본 이름으로 되돌린다 */
export function saveName(agent: AgentSnapshot, name: string): void {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  const next = { ...saved };
  if (trimmed) next[profileKey(agent)] = trimmed;
  else delete next[profileKey(agent)];
  saved = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // 저장소를 못 쓰는 환경에서는 이번 창에서만 바뀐 이름을 쓴다
  }
}
