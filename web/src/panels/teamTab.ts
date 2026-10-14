// 팀 탭: 리더(CEO 자리)와 역할별 팀원, 팀 할 일, 팀원끼리 오간 메시지.
import { activityLabel, lt, t } from '../i18n.ts';
import { roleLabel } from '../names.ts';
import { recipientLabel, teamsOf } from '../office/team.ts';
import type { AgentView } from './agentView.ts';
import { escapeHtml } from './dom.ts';

const MESSAGES_SHOWN = 20;
const timeOf = (at: number) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function teamTabHtml(views: AgentView[]): string {
  const byId = new Map(views.map((v) => [v.agent.id, v]));
  const { list } = teamsOf(views.map((v) => v.agent));
  if (!list.length) return `<p class="muted">${t('team.none')}</p>`;
  return list.map((team) => {
    const lead = byId.get(team.leadId);
    const members = team.memberIds.map((id) => byId.get(id)).filter((v): v is AgentView => Boolean(v));
    const everyone = [lead, ...members].filter((v): v is AgentView => Boolean(v));
    const nameOf = (id: string) => byId.get(id)?.name ?? id;
    const messages = everyone
      .flatMap((v) => v.agent.messages.map((m) => ({ ...m, from: v.agent.id })))
      .sort((a, b) => b.at - a.at)
      .slice(0, MESSAGES_SHOWN);
    const tasks = lead?.agent.teamTasks ?? [];
    return `<div class="group team">
      <h3><span class="chip role">CEO</span>${escapeHtml(lead?.name ?? '')} <small class="muted">${t('team.lead')}</small></h3>
      <ul class="members">${members.map((m) => `<li data-select="${m.agent.id}">
        <span class="chip role">${escapeHtml(roleLabel(m.agent.role))}</span><b>${escapeHtml(m.name)}</b>
        <span class="muted">${escapeHtml(lt(m.agent.summary) || activityLabel(m.agent.activity))}</span></li>`).join('')}</ul>
      ${tasks.length ? `<p class="muted">${t('team.tasks')}</p><ul class="todos">${tasks.map((task) =>
        `<li><span class="chip ${task.status === 'done' ? 'completed' : 'in_progress'}">${task.status === 'done' ? t('team.done') : t('team.open')}</span>${escapeHtml(task.subject)}${task.owner ? ` <small class="muted">${escapeHtml(task.owner)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${messages.length ? `<p class="muted">${t('team.messages')}</p><ol class="timeline">${messages.map((m) =>
        `<li><time>${timeOf(m.at)}</time><span><b>${escapeHtml(nameOf(m.from))}</b> → ${escapeHtml(recipientLabel(m.to))}: ${escapeHtml(m.text)}</span></li>`).join('')}</ol>` : ''}
    </div>`;
  }).join('');
}
