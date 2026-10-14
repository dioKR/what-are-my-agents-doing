// 지도 위쪽의 에이전트 카드 줄: 얼굴, 이름과 상태 배지, 지금 하는 일, 컨텍스트 막대.
import { activityLabel, lt, statusLabel, t } from '../i18n.ts';
import type { AgentView } from './agentView.ts';
import { contextColor, escapeHtml, needsAttention, percent, setHtml, statusGroupOf } from './dom.ts';

export function renderAgentBar(el: HTMLElement, views: AgentView[], selectedId: string | null): void {
  const html = views.map(({ agent, name, portrait }) => {
    const ratio = agent.contextUsedRatio;
    const group = statusGroupOf(agent.activity);
    const status = statusLabel(group);
    const alert = needsAttention(agent.activity) ? ` alert-${agent.activity}` : '';
    const ended = agent.activity === 'ended' ? ' ended' : '';
    const doing = lt(agent.summary) || activityLabel(agent.activity);
    const bar = ratio === null
      ? `<span class="minibar unknown" title="${t('inspector.contextUnknown')}"><i></i></span>`
      : `<span class="minibar" title="${t('inspector.context')} ${percent(ratio)}%"><i style="width:${percent(ratio)}%;background:${contextColor(ratio)}"></i></span>`;
    return `<button type="button" class="agentcard${alert}${ended}" data-select="${agent.id}" aria-pressed="${agent.id === selectedId}"
      aria-label="${escapeHtml(name)}, ${escapeHtml(status)}: ${escapeHtml(doing)}${ratio === null ? '' : `, ${t('inspector.context')} ${percent(ratio)}%`}">
      <span class="head">${portrait ? `<img src="${portrait}" alt="" width="28" height="30">` : ''}<span class="who"><span class="nm">${escapeHtml(name)}</span><span class="badge s-${group}">${escapeHtml(status)}</span></span></span>
      <span class="st" title="${escapeHtml(doing)}">${escapeHtml(doing)}</span>${bar}</button>`;
  }).join('');
  setHtml(el, html);
}
