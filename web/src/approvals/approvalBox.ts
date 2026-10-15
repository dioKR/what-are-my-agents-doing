// 상세 칸 "내 차례" 박스 안의 허용 · 거부 단추. 승인을 기다리는 에이전트에만 나온다.
import type { AgentSnapshot } from '../../../shared/protocol.ts';
import { escapeHtml } from '../panels/dom.ts';
import { t } from '../i18n.ts';
import { appSettings, askOf } from './approvals.ts';

export function approvalBoxHtml(agent: AgentSnapshot, now: number): string {
  if (agent.activity !== 'waiting-permission') return '';
  if (!appSettings().approvals) {
    return `<div class="approval off"><button class="btn sm" type="button" data-approvals-enable>${t('approval.enable')}</button></div>`;
  }
  const ask = askOf(agent.id);
  // 앱의 대답을 기다리는 시간이 지났거나 예전 훅이면 터미널에서 대답해야 한다
  if (!ask) return `<div class="approval"><small class="muted">${t('approval.terminalOnly')}</small></div>`;
  const seconds = Math.max(0, Math.ceil((ask.expiresAt - now) / 1000));
  return `
    <div class="approval">
      <code title="${escapeHtml(ask.detail)}">${escapeHtml(ask.detail || ask.toolName)}</code>
      <div class="approval-acts">
        <button class="btn sm primary" type="button" data-approve="${ask.id}">${t('approval.allow')}</button>
        <button class="btn sm" type="button" data-deny="${ask.id}">${t('approval.deny')}</button>
        <small class="muted">${t('approval.countdown', { n: seconds })}</small>
      </div>
    </div>`;
}
