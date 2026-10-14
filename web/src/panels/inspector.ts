// 상세 칸: 고른 에이전트가 지금 무엇을 하는지(상태 헤더), 내가 할 일이 있는지(내 차례 박스), 그 밖의 자세한 내용. 이름 바꾸기도 여기서 한다.
import type { AgentLink, AgentSnapshot } from '../../../shared/protocol.ts';
import { activityLabel, lt, statusLabel, t, todoLabel } from '../i18n.ts';
import { MAX_NAME_LENGTH, TOOL_FULL_LABEL } from '../names.ts';
import type { AgentView } from './agentView.ts';
import { contextColor, escapeHtml, FRESH_LINK_MS, linkAnchor, percent, setHtml, statusGroupOf } from './dom.ts';

const RECENT_MAIL_COUNT = 3;
/** 내 차례 박스에 올리는 링크 수. 넘치면 링크 탭으로 보낸다. */
const TURN_LINKS_SHOWN = 3;

export function renderInspector(el: HTMLElement, view: AgentView | undefined, renaming: boolean): void {
  if (!view) {
    setHtml(el, `<p class="muted">${t('inspector.pick')}</p>`);
    return;
  }
  setHtml(el, renaming ? renameForm(view) : details(view));
}

function renameForm({ agent, name }: AgentView): string {
  return `<div class="who"><b>${t('rename.title')}</b><span>${TOOL_FULL_LABEL[agent.tool]} · ${escapeHtml(agent.cwd)}</span></div>
    <form class="rename" data-rename-form="${agent.id}">
      <label for="renameInput" class="muted">${t('rename.label')}</label>
      <input id="renameInput" name="name" maxlength="${MAX_NAME_LENGTH}" value="${escapeHtml(name)}" autocomplete="off">
      <button class="btn sm primary" type="submit">${t('btn.save')}</button>
      <button class="btn sm" type="button" data-rename-cancel>${t('btn.cancel')}</button>
    </form>
    <p class="muted">${t('rename.hint')}</p>`;
}

/** 위에서부터 중요한 순서: 지금 하는 일 → 내가 할 일 → 맡은 일·남긴 말 → 컨텍스트 → 그 밖 */
function details(view: AgentView): string {
  const { agent } = view;
  return statusHead(view) + myTurn(agent, Date.now()) + explain(agent) + contextLine(agent.contextUsedRatio) + extras(agent);
}

// ---------- 상태 헤더 ----------
function statusHead({ agent, name }: AgentView): string {
  const group = statusGroupOf(agent.activity);
  const doing = lt(agent.summary) || activityLabel(agent.activity);
  const meta = [TOOL_FULL_LABEL[agent.tool], agent.role, agent.cwd].filter(Boolean).join(' · ');
  return `<div class="status-head s-${group}">
    <div class="sh-top"><span class="badge lg s-${group}">${escapeHtml(statusLabel(group))}</span><b class="sh-name">${escapeHtml(name)}</b></div>
    <p class="sh-now" title="${escapeHtml(doing)}">${escapeHtml(doing)}</p>
    ${agent.detail ? `<code class="sh-cmd" title="${escapeHtml(agent.detail)}">${escapeHtml(agent.detail)}</code>` : ''}
    <div class="sh-meta"><span title="${escapeHtml(meta)}">${escapeHtml(meta)}</span>
      <span class="sh-acts"><button class="btn-link" type="button" data-rename="${agent.id}">${t('btn.rename')}</button> · <button class="btn-link" type="button" data-customize="${agent.id}">${t('btn.customize')}</button></span></div>
  </div>`;
}

// ---------- 내 차례 박스 ----------
type TurnKind = 'stuck' | 'approve' | 'reply' | 'links' | 'none';

/** 먼저 맞는 하나가 박스 머리 줄이 된다: 막힘 > 승인 > 답장 > 링크 > 없음 */
function turnKindOf(agent: AgentSnapshot, linkCount: number): TurnKind {
  if (agent.activity === 'stuck') return 'stuck';
  if (agent.activity === 'waiting-permission') return 'approve';
  if (agent.activity === 'waiting-user') return 'reply';
  if (linkCount > 0) return 'links';
  return 'none';
}

const TURN_ICON: Record<TurnKind, string> = { stuck: '!!', approve: '!', reply: '↩', links: '↗', none: '–' };

function turnLead(kind: TurnKind, agent: AgentSnapshot, linkCount: number): { title: string; hint: string | null } {
  switch (kind) {
    case 'stuck': return { title: t('turn.stuck', { n: agent.failStreak }), hint: t('turn.stuckHint') };
    case 'approve': return { title: t('turn.approve'), hint: t('turn.approveHint') };
    case 'reply': return { title: t('turn.reply'), hint: t('turn.replyHint') };
    case 'links': return { title: t('turn.links', { n: linkCount }), hint: null };
    case 'none': return { title: t('turn.none'), hint: null };
  }
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** 같은 곳을 가리키는 주소를 하나로 본다: localhost·127.0.0.1은 같은 컴퓨터, 끝의 '/'는 없어도 같다 */
function sameAddressKey(url: string): string {
  try {
    const parsed = new URL(url);
    if (LOOPBACK_HOSTS.has(parsed.hostname)) parsed.hostname = 'localhost';
    return parsed.href.replace(/\/$/, '');
  } catch {
    return url;
  }
}

/** 사람이 열어 볼 링크(PR·로컬 서버)만, 같은 주소는 가장 최근 것 하나로, 새것부터 */
function linksToCheck(links: AgentLink[]): AgentLink[] {
  const latestByAddress = new Map<string, AgentLink>();
  for (const link of links) {
    if (link.kind === 'web') continue;
    const key = sameAddressKey(link.url);
    const kept = latestByAddress.get(key);
    if (!kept || link.at > kept.at) latestByAddress.set(key, link);
  }
  return [...latestByAddress.values()].sort((a, b) => b.at - a.at);
}

function myTurn(agent: AgentSnapshot, now: number): string {
  const links = linksToCheck(agent.links);
  const kind = turnKindOf(agent, links.length);
  const lead = turnLead(kind, agent, links.length);
  const leadHtml = `<div class="lead"><span class="ic" aria-hidden="true">${TURN_ICON[kind]}</span><b>${escapeHtml(lead.title)}</b>${lead.hint ? `<small>${escapeHtml(lead.hint)}</small>` : ''}</div>`;
  return `<div class="my-turn k-${kind}">${leadHtml}${links.length ? turnLinks(links, kind !== 'links', now) : ''}</div>`;
}

function turnLinks(links: AgentLink[], withHeading: boolean, now: number): string {
  const rows = links.slice(0, TURN_LINKS_SHOWN).map((link) => {
    const isFresh = now - link.at < FRESH_LINK_MS;
    return `<li>${linkAnchor(link)}${isFresh ? `<span class="chip new">${t('link.new')}</span>` : ''}</li>`;
  }).join('');
  const seeAll = links.length > TURN_LINKS_SHOWN
    ? `<button class="btn-link" type="button" data-tab="links">${escapeHtml(t('turn.allLinks', { n: links.length }))}</button>`
    : '';
  return `<div class="turn-links${withHeading ? ' sub' : ''}">${withHeading ? `<span class="muted">${t('turn.linksSub')}</span>` : ''}<ul>${rows}</ul>${seeAll}</div>`;
}

// ---------- 맡은 일·남긴 말, 컨텍스트, 그 밖 ----------
function explain(agent: AgentSnapshot): string {
  if (!agent.request && !agent.narration) return '';
  return `<dl class="explain">
    ${agent.request ? `<dt>${t('inspector.request')}</dt><dd class="req" title="${escapeHtml(agent.request)}">${escapeHtml(agent.request)}</dd>` : ''}
    ${agent.narration ? `<dt>${t('inspector.said')}</dt><dd class="say" title="${escapeHtml(agent.narration)}">${escapeHtml(agent.narration)}</dd>` : ''}
  </dl>`;
}

function contextLine(ratio: number | null): string {
  const label = `<span>${t('inspector.contextShort')}</span>`;
  if (ratio === null) return `<div class="ctx">${label}<span class="unknown">${t('inspector.unknown')}</span></div>`;
  return `<div class="ctx">${label}<div class="bar"><i style="width:${percent(ratio)}%;background:${contextColor(ratio)}"></i></div><b>${percent(ratio)}%</b></div>`;
}

function extras(agent: AgentSnapshot): string {
  const todos = agent.todos.length
    ? `<ul class="todos">${agent.todos.map((td) => `<li><span class="chip ${td.status}">${todoLabel(td.status)}</span>${escapeHtml(td.content)}</li>`).join('')}</ul>`
    : '';
  const subs = agent.subagents.length
    ? `<p class="muted">${escapeHtml(t('inspector.subagents', { list: agent.subagents.map((s) => s.label).join(', ') }))}</p>`
    : '';
  const mail = agent.mail.slice(0, RECENT_MAIL_COUNT).map((m) =>
    `<li>${m.direction === 'sent' ? t('inspector.sent') : t('inspector.read')} · ${escapeHtml(m.channel)} ${escapeHtml(m.target)}</li>`).join('');
  return `${todos}${subs}${mail ? `<ul class="mail-mini">${mail}</ul>` : ''}`;
}
