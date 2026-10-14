// 에이전트 팀(Claude Code agent teams) 이벤트를 "누구의 상태로 반영할지" 정한다.
// - 리더(사람이 대화하는 세션)의 이벤트: 그 세션 상태로
// - 팀원 이벤트(teammate_name이 있거나, agent_id가 있고 팀 역할): 리더 아래 팀원 상태로
// - 그 밖의 보통 하위 에이전트 이벤트: 버린다 (부모 세션의 Task 도구 사용으로 이미 보여 준다)
import type { ClaudeHookPayload } from './claudeHook.ts';

/** 팀 킷(team/agents/*.md)의 역할 이름. 이 이름으로 만든 하위 에이전트는 팀원으로 본다. */
export const TEAM_ROLES = ['po', 'pm', 'design', 'fe', 'be', 'infra', 'qa', 'data'] as const;
const ROLE_ALIASES: Record<string, string> = {
  frontend: 'fe', 'frontend-dev': 'fe', backend: 'be', 'backend-dev': 'be', devops: 'infra', sre: 'infra',
  designer: 'design', 'product-owner': 'po', 'product-manager': 'pm', tester: 'qa', 'data-analyst': 'data'
};

export interface Route {
  /** 상태를 저장할 키 (리더는 session_id, 팀원은 session_id#팀원 이름) */
  key: string;
  member: { parentId: string; role: string | null; memberName: string | null } | null;
}

export function normalizeRole(agentType: string | undefined): string | null {
  if (!agentType) return null;
  const lower = agentType.trim().toLowerCase();
  return ROLE_ALIASES[lower] ?? lower;
}

const isTeamRole = (role: string | null) => role !== null && (TEAM_ROLES as readonly string[]).includes(role);

/**
 * 팀원 상태 키는 "리더 세션#팀원 이름"이다. 같은 팀원이 훅(agent_id·agent_type)과 대화 기록(teammate_name)
 * 두 길로 들어와도 같은 캐릭터 하나로 모이게 하려고, 길마다 다른 agent_id 대신 이름을 쓴다.
 */
export function routeEvent(e: ClaudeHookPayload): Route | null {
  const isTeamTask = e.hook_event_name === 'TaskCreated' || e.hook_event_name === 'TaskCompleted';
  if (isTeamTask) return { key: e.session_id, member: null };

  const role = normalizeRole(e.agent_type);
  const memberName = e.teammate_name ?? (e.agent_id && isTeamRole(role) ? e.agent_type ?? null : null);
  if (memberName) return { key: `${e.session_id}#${memberName}`, member: { parentId: e.session_id, role, memberName } };
  // 팀원이 아닌 보통 하위 에이전트(Explore 등)의 이벤트는 버린다
  return e.agent_id ? null : { key: e.session_id, member: null };
}
