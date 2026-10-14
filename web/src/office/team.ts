// 에이전트 목록에서 팀(리더 + 팀원)을 묶고, 메시지를 받을 팀원을 찾는다.
import { isBroadcastRecipient, type AgentSnapshot } from '../../../shared/protocol.ts';
import type { Spot } from './map.ts';
import { t } from '../i18n.ts';

export type TeamSeat = Spot & { facing: 'down' | 'up' | 'left' };

/** 회의실 자리 순서 = 이 역할 순서 (기획 → 디자인 → 개발 → 인프라) */
const ROLE_ORDER = ['po', 'pm', 'design', 'fe', 'be', 'infra', 'qa', 'data'];
const LEAD_NAMES = new Set(['team-lead', 'lead', 'leader', 'ceo']);

export interface Team { leadId: string; memberIds: string[] }

export function teamsOf(agents: AgentSnapshot[]): { list: Team[]; byAgent: Map<string, Team> } {
  const ids = new Set(agents.map((a) => a.id));
  const groups = new Map<string, AgentSnapshot[]>();
  for (const agent of agents) {
    if (!agent.parentId || !ids.has(agent.parentId)) continue;
    groups.set(agent.parentId, [...(groups.get(agent.parentId) ?? []), agent]);
  }
  const rank = (a: AgentSnapshot) => { const i = ROLE_ORDER.indexOf(a.role ?? ''); return i < 0 ? ROLE_ORDER.length : i; };
  const list = [...groups.entries()].map(([leadId, members]) => ({
    leadId,
    memberIds: members.sort((a, b) => rank(a) - rank(b) || (a.memberName ?? '').localeCompare(b.memberName ?? '')).map((m) => m.id)
  }));
  const byAgent = new Map<string, Team>();
  list.forEach((team) => { byAgent.set(team.leadId, team); team.memberIds.forEach((id) => byAgent.set(id, team)); });
  return { list, byAgent };
}

/** 메시지의 받는 사람 이름으로 팀 안의 대상을 찾는다 ('*'면 보낸 사람 빼고 모두) */
/** 받는 사람을 화면에 쓸 이름으로 ('*'·all 같은 전체 대상은 "모두") */
export function recipientLabel(to: string): string {
  return isBroadcastRecipient(to) ? t('team.everyone') : to;
}

export function findRecipients(team: Team, fromId: string, to: string, byId: ReadonlyMap<string, AgentSnapshot>): string[] {
  const target = to.trim().toLowerCase();
  if (LEAD_NAMES.has(target)) return [team.leadId];
  const everyone = [team.leadId, ...team.memberIds].filter((id) => id !== fromId);
  if (isBroadcastRecipient(target)) return everyone;
  return everyone.filter((id) => {
    const a = byId.get(id);
    return a && (a.memberName?.toLowerCase() === target || a.role === target);
  });
}
