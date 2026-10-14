// 꾸미기 상점 창: 코인, 머리 장식·펫 목록(사기 · 입히기 · 벗기기), 코인 버는 법, 최근에 번 코인.
// 물건은 지금 고른 캐릭터에게 입힌다. 고른 캐릭터가 없으면 사기만 할 수 있다.
import { REWARD_COINS, SHOP_ITEMS, type RewardReason, type ShopItem, type ShopSlot } from '../../../shared/shop.ts';
import type { DollLook } from '../office/character/doll.ts';
import { PRESETS } from '../office/look.ts';
import { petFrame } from '../office/pets/pets.ts';
import { previewOf } from '../office/portrait.ts';
import type { AgentView } from '../panels/agentView.ts';
import { escapeHtml, setHtml } from '../panels/dom.ts';
import { lt, t } from '../i18n.ts';
import { currentWallet, equippedOf } from './wallet.ts';

const REASONS: RewardReason[] = ['turn', 'todo', 'teamTask', 'pr'];
const petPreviews = new Map<string, string>();

function previewSrc(item: ShopItem, doll: DollLook): string {
  if (item.slot === 'head') return previewOf({ ...doll, accessory: item.id as DollLook['accessory'] });
  const cached = petPreviews.get(item.id);
  if (cached) return cached;
  const url = petFrame(item.id as Parameters<typeof petFrame>[0], 'idle', 'left').toDataURL();
  petPreviews.set(item.id, url);
  return url;
}

function actionButton(item: ShopItem, selected: AgentView | undefined): string {
  const wallet = currentWallet();
  if (!wallet.owned.includes(item.id)) {
    const affordable = wallet.coins >= item.price;
    return `<button class="btn sm primary" type="button" data-shop-buy="${item.id}"${affordable ? '' : ' disabled'}>${t('shop.buy', { price: item.price })}</button>`;
  }
  if (!selected) return `<span class="shop-owned">${t('shop.owned')}</span>`;
  const worn = equippedOf(selected.agent)[item.slot] === item.id;
  return worn
    ? `<button class="btn sm" type="button" data-shop-unequip="${item.slot}">${t(item.slot === 'pet' ? 'shop.leave' : 'shop.takeOff')}</button>`
    : `<button class="btn sm primary" type="button" data-shop-equip="${item.id}" data-slot="${item.slot}">${t(item.slot === 'pet' ? 'shop.bring' : 'shop.wear')}</button>`;
}

/** views: 입힐 캐릭터를 고르는 줄에 보여 줄 에이전트들 */
export function renderShop(el: HTMLElement, tab: ShopSlot, views: AgentView[], selected: AgentView | undefined): void {
  const wallet = currentWallet();
  const doll = selected?.look?.doll ?? PRESETS[0].look;
  const items = SHOP_ITEMS.filter((item) => item.slot === tab);
  const cards = items.map((item) => `
    <li class="shop-card${selected && equippedOf(selected.agent)[item.slot] === item.id ? ' worn' : ''}">
      <img class="shop-preview ${item.slot}" src="${previewSrc(item, doll)}" alt="">
      <b>${escapeHtml(lt(item.label))}</b>
      <span class="shop-price"><span class="coin-icon" aria-hidden="true"></span>${item.price}</span>
      ${actionButton(item, selected)}
    </li>`).join('');
  const recent = wallet.recent.slice(0, 8).map((e) => `
    <li><span>${escapeHtml(e.who)}</span><span class="muted">${t(`shop.reason.${e.reason}`)}</span><b>+${e.amount}</b></li>`).join('');

  setHtml(el, `
    <div class="shop-head">
      <h2>${t('shop.title')}</h2>
      <span class="shop-coins"><span class="coin-icon" aria-hidden="true"></span>${wallet.coins}</span>
      <button class="btn sm" type="button" data-shop-close aria-label="${t('shop.close')}">✕</button>
    </div>
    <p class="shop-for">${selected ? t('shop.for', { name: escapeHtml(selected.name) }) : t('shop.pick')}</p>
    <div class="shop-picker">${views.map((v) => `<button type="button" class="shop-pick${v.agent.id === selected?.agent.id ? ' on' : ''}" data-select="${v.agent.id}" title="${escapeHtml(v.name)}">${v.portrait ? `<img src="${v.portrait}" alt="">` : ''}<span>${escapeHtml(v.name)}</span></button>`).join('')}</div>
    <div class="tablist shop-tabs" role="tablist">
      ${(['head', 'pet'] as const).map((slot) => `<button type="button" role="tab" aria-selected="${slot === tab}" data-shop-tab="${slot}">${t(`shop.tab.${slot}`)}</button>`).join('')}
    </div>
    <ul class="shop-grid">${cards}</ul>
    <div class="shop-foot">
      <section>
        <h3>${t('shop.howToEarn')}</h3>
        <ul class="shop-rules">${REASONS.map((r) => `<li><span>${t(`shop.reason.${r}`)}</span><b>+${REWARD_COINS[r]}</b></li>`).join('')}</ul>
        <p class="muted">${t('shop.liveOnly')}</p>
      </section>
      <section>
        <h3>${t('shop.recent')}</h3>
        ${recent ? `<ul class="shop-recent">${recent}</ul>` : `<p class="muted">${t('shop.noRecent')}</p>`}
      </section>
    </div>`);
}
