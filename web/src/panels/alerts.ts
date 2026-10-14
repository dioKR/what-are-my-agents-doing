// 지도 오른쪽 알림: 사람이 봐야 하는 일과 막 알려 준 링크만 띄운다.
import { t } from '../i18n.ts';
import type { AgentView } from './agentView.ts';
import { escapeHtml, FRESH_LINK_MS, linkAnchor, setHtml } from './dom.ts';

const CONTEXT_WARNING_RATIO = 0.85;
const MAX_LINK_ALERTS = 3;

interface Alert { level: 'danger' | 'warn' | 'info'; icon: string; text: string; agentId: string }

function alertsFor({ agent, name }: AgentView): Alert[] {
  const alerts: Alert[] = [];
  if (agent.activity === 'stuck') alerts.push({ level: 'danger', icon: '!!', text: t('alert.stuck', { name, n: agent.failStreak }), agentId: agent.id });
  if (agent.activity === 'waiting-permission') alerts.push({ level: 'warn', icon: '!', text: t('alert.permission', { name }), agentId: agent.id });
  const ratio = agent.contextUsedRatio ?? 0;
  if (ratio >= CONTEXT_WARNING_RATIO && agent.activity !== 'compacting') alerts.push({ level: 'info', icon: 'i', text: t('alert.context', { name, n: Math.round(ratio * 100) }), agentId: agent.id });
  return alerts;
}

export function renderAlerts(el: HTMLElement, views: AgentView[], now: number): void {
  const states = views.flatMap(alertsFor).map((a) =>
    `<button type="button" class="alert t-${a.level}" data-select="${a.agentId}"><span class="ic" aria-hidden="true">${a.icon}</span><span class="tx">${escapeHtml(a.text)}</span></button>`
  );
  const links = views
    .flatMap(({ agent, name }) => agent.links.filter((l) => l.kind !== 'web' && now - l.at < FRESH_LINK_MS).map((l) => ({ l, name })))
    .sort((a, b) => b.l.at - a.l.at)
    .slice(0, MAX_LINK_ALERTS)
    .map(({ l, name }) => `<div class="alert alert-link" title="${escapeHtml(name)}">${linkAnchor(l)}</div>`);
  setHtml(el, [...states, ...links].join(''));
}
