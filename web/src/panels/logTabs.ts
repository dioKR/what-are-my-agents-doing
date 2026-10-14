// 오른쪽 아래 탭: 활동 기록 · 링크 · 우편 기록 · 할 일.
import { currentLang, lt, t, todoLabel } from '../i18n.ts';
import type { AgentView } from './agentView.ts';
import { escapeHtml, linkAnchor, setHtml } from './dom.ts';
import { teamTabHtml } from './teamTab.ts';

export type LogTab = 'activity' | 'team' | 'links' | 'mail' | 'todos';

const timeOf = (at: number) => new Date(at).toLocaleTimeString(currentLang() === 'ko' ? 'ko-KR' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

export function renderLogTab(el: HTMLElement, tab: LogTab, views: AgentView[], selected: AgentView | undefined): void {
  const html = tab === 'activity' ? activityLog(selected) : tab === 'team' ? teamTabHtml(views) : tab === 'links' ? linkList(views) : tab === 'mail' ? mailLog(views) : todoBoard(views);
  setHtml(el, html);
}

function activityLog(view: AgentView | undefined): string {
  if (!view) return `<p class="muted">${t('log.pick')}</p>`;
  if (!view.agent.recent.length) return `<p class="muted">${escapeHtml(t('log.none', { name: view.name }))}</p>`;
  return `<p class="muted">${escapeHtml(t('log.title', { name: view.name }))}</p>
    <ol class="timeline">${view.agent.recent.map((r) => `<li><time>${timeOf(r.at)}</time><span>${escapeHtml(lt(r.text))}</span></li>`).join('')}</ol>`;
}

function linkList(views: AgentView[]): string {
  const rows = views.flatMap(({ agent, name }) => agent.links.map((l) => ({ ...l, name }))).sort((a, b) => b.at - a.at);
  if (!rows.length) return `<p class="muted">${t('links.none')}</p>`;
  return `<ol class="timeline links-list">${rows.map((r) => `<li><time>${timeOf(r.at)}</time><span>${linkAnchor(r)}<small>${escapeHtml(r.name)}</small></span></li>`).join('')}</ol>`;
}

function mailLog(views: AgentView[]): string {
  const rows = views.flatMap(({ agent, name }) => agent.mail.map((m) => ({ ...m, name }))).sort((a, b) => b.at - a.at);
  if (!rows.length) return `<p class="muted">${t('mail.none')}</p>`;
  return `<table class="tbl"><thead><tr><th scope="col">${t('mail.time')}</th><th scope="col">${t('mail.who')}</th><th scope="col"></th><th scope="col">${t('mail.where')}</th><th scope="col">${t('mail.what')}</th></tr></thead><tbody>${
    rows.map((r) => `<tr><td class="num">${timeOf(r.at)}</td><td>${escapeHtml(r.name)}</td>
      <td><span class="chip ${r.direction === 'sent' ? 'in_progress' : 'pending'}">${r.direction === 'sent' ? t('inspector.sent') : t('inspector.read')}</span></td>
      <td>${escapeHtml(r.channel)} ${escapeHtml(r.target)}</td><td>${escapeHtml(r.preview)}</td></tr>`).join('')
  }</tbody></table>`;
}

function todoBoard(views: AgentView[]): string {
  const groups = views.filter(({ agent }) => agent.todos.length);
  if (!groups.length) return `<p class="muted">${t('todos.none')}</p>`;
  return groups.map(({ agent, name, look }) => `<div class="group"><h3><i style="background:${look?.accent ?? '#888'}"></i>${escapeHtml(name)}</h3>
    <ul class="todos">${agent.todos.map((td) => `<li><span class="chip ${td.status}">${todoLabel(td.status)}</span>${escapeHtml(td.content)}</li>`).join('')}</ul></div>`).join('');
}
