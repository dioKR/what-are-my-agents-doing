// 캐릭터나 카드를 오른쪽 클릭하면 뜨는 메뉴.
// 항목은 기존 단추와 같은 data-속성을 써서, 누르면 원래 단추를 누른 것과 똑같이 동작한다
// (data-select로 그 에이전트를 고른 뒤 이름 바꾸기 · 꾸미기를 연다).
import type { ApprovalAsk } from '../../../shared/approvals.ts';
import { t } from '../i18n.ts';
import type { AgentView } from './agentView.ts';
import { escapeHtml, setHtml } from './dom.ts';

/** 메뉴가 화면 가장자리에서 떨어질 거리 */
const EDGE_GAP = 8;

function menuHtml(view: AgentView, ask: ApprovalAsk | undefined): string {
  const id = view.agent.id;
  const item = (attrs: string, label: string, extra = '') => `<button type="button" role="menuitem" ${attrs}${extra}>${label}</button>`;
  const latestLink = view.agent.links.find((l) => l.kind !== 'web');
  const approval = ask
    ? item(`data-approve="${ask.id}"`, t('menu.allow'), ` class="primary" title="${escapeHtml(ask.detail)}"`) + item(`data-deny="${ask.id}"`, t('menu.deny')) + '<hr>'
    : '';
  const link = latestLink
    ? `<a role="menuitem" href="${escapeHtml(latestLink.url)}" target="_blank" rel="noopener noreferrer">${t('menu.openLink')}</a>`
    : '';
  return `
    <p class="agent-menu-title">${escapeHtml(view.name)}</p>
    ${approval}
    ${item(`data-select="${id}" data-rename="${id}"`, t('btn.rename'))}
    ${item(`data-select="${id}" data-customize="${id}"`, t('btn.customize'))}
    ${item(`data-open-folder="${id}"`, t('menu.openFolder'))}
    ${link}
    <hr>
    ${item(`data-dismiss="${id}"`, t('menu.dismiss'), ` title="${escapeHtml(t('menu.dismissHint'))}"`)}`;
}

/** (x, y) 화면 좌표에 메뉴를 띄우고 첫 항목에 초점을 둔다. 화면 밖으로 나가지 않게 안쪽으로 당긴다 */
export function openAgentMenu(el: HTMLElement, view: AgentView, ask: ApprovalAsk | undefined, x: number, y: number): void {
  setHtml(el, menuHtml(view, ask));
  el.hidden = false;
  const { width, height } = el.getBoundingClientRect();
  el.style.left = `${Math.max(EDGE_GAP, Math.min(x, window.innerWidth - width - EDGE_GAP))}px`;
  el.style.top = `${Math.max(EDGE_GAP, Math.min(y, window.innerHeight - height - EDGE_GAP))}px`;
  menuItems(el)[0]?.focus();
}

export function closeAgentMenu(el: HTMLElement): void {
  el.hidden = true;
}

export const menuItems = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[role="menuitem"]')];

/** 위 · 아래 화살표로 항목 사이를 옮긴다 (끝에서 처음으로 돈다) */
export function moveMenuFocus(el: HTMLElement, step: 1 | -1): void {
  const items = menuItems(el);
  const at = items.indexOf(document.activeElement as HTMLElement);
  items[(at + step + items.length) % items.length]?.focus();
}
