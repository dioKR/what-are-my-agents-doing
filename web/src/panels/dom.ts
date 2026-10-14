import type { Activity, AgentLink } from '../../../shared/protocol.ts';
import { lt, t, type StatusGroup } from '../i18n.ts';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 내용이 같으면 DOM을 건드리지 않는다 (입력 중인 칸·포커스가 날아가지 않게) */
export function setHtml(el: HTMLElement, html: string): void {
  if (el.dataset.rendered === html) return;
  el.innerHTML = html;
  el.dataset.rendered = html;
}

export const percent = (ratio: number) => Math.round(ratio * 100);

/** 이 시간 안에 알려 준 PR·로컬 서버 링크는 '막 알려 준' 링크로 본다 (지도 알림, 새 칩) */
export const FRESH_LINK_MS = 10 * 60_000;

/** 에이전트가 알려 준 링크를 새 탭으로 여는 <a>. http(s) 주소만 링크로 만든다. */
export function linkAnchor(link: AgentLink): string {
  const safe = /^https?:\/\//i.test(link.url);
  const label = escapeHtml(lt(link.label));
  const chip = `<span class="chip link-${link.kind}">${t(`link.${link.kind}`)}</span>`;
  if (!safe) return `${chip}<span>${label}</span>`;
  return `${chip}<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.url)}">${label}</a>`;
}

/** 11개 활동을 처음 보는 사람도 한눈에 가를 수 있게 묶는다. 묶음마다 배지 색이 하나다 (카드와 상세 칸이 같이 쓴다). */
const STATUS_GROUP: Record<Activity, StatusGroup> = {
  working: 'work', thinking: 'work', background: 'work',
  researching: 'web', 'mail-send': 'web', 'mail-read': 'web',
  'waiting-user': 'idle',
  'waiting-permission': 'turn',
  stuck: 'stuck',
  compacting: 'rest', ended: 'rest'
};
export const statusGroupOf = (activity: Activity): StatusGroup => STATUS_GROUP[activity];

/** 사람이 봐야 하는 상태. 카드와 알림에서 눈에 띄게 표시한다. */
export const needsAttention = (activity: Activity): boolean => activity === 'waiting-permission' || activity === 'stuck';

/** 컨텍스트 사용률 막대 색: 많이 찰수록 경고색 */
export function contextColor(ratio: number): string {
  if (ratio >= 0.85) return 'var(--danger)';
  if (ratio >= 0.6) return 'var(--amber)';
  return 'var(--good)';
}
