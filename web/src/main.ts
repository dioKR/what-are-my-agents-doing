// 진입점: 상태를 받아(source) → 캐릭터를 움직이고(director) → 그리고(renderer) → 패널을 갱신한다.
import './styles.css';
import type { AgentSnapshot, ServerMessage } from '../../shared/protocol.ts';
import { ActorDirector } from './office/actors.ts';
import type { DollLook } from './office/character/doll.ts';
import { ambientAt, type TimeMode } from './office/lighting.ts';
import { PRESETS, toLook } from './office/look.ts';
import { customLookOf, saveLook } from './looks.ts';
import { readLookForm, renderLookEditor } from './panels/lookEditor.ts';
import { MapLabels } from './office/labels.ts';
import { MAP_H, MAP_W, TILE, VIEW, paintFloor } from './office/map.ts';
import { portraitOf } from './office/portrait.ts';
import { actorBox, renderOffice } from './office/renderer.ts';
import { DOLL_H, DOLL_W } from './office/character/doll.ts';
import { displayName, saveName } from './names.ts';
import { renderAgentBar } from './panels/agentBar.ts';
import { renderAlerts } from './panels/alerts.ts';
import type { AgentView } from './panels/agentView.ts';
import { renderInspector } from './panels/inspector.ts';
import { renderLogTab, type LogTab } from './panels/logTabs.ts';
import { liveSource } from './source/liveSource.ts';
import { closeSettingsOnClickAwayOrEscape } from './panels/settingsMenu.ts';
import { applyStaticTexts, currentLang, setLang, t, type Lang } from './i18n.ts';
import type { ShopSlot } from '../../shared/shop.ts';
import { PetKeeper } from './office/pets/pets.ts';
import { ClubMusic } from './office/music/clubMusic.ts';
import { renderShop } from './shop/shopPanel.ts';
import { activeCoinPops, addCoinPop, buyItem, currentWallet, equipItem, equippedOf, setWallet } from './shop/wallet.ts';

const MAP_PX_W = MAP_W * TILE;
const MAP_PX_H = MAP_H * TILE;
/** 화면에 보이는 범위 (지도 픽셀) */
const VIEW_PX = { x: VIEW.x * TILE, y: VIEW.y * TILE, w: VIEW.w * TILE, h: VIEW.h * TILE };
const PANEL_REFRESH_SECONDS = 0.25;
const MAX_FRAME_SECONDS = 0.1;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = byId<HTMLCanvasElement>('map');
canvas.width = VIEW.w * TILE;
canvas.height = VIEW.h * TILE;
const g = canvas.getContext('2d')!;
const els = {
  stage: byId('stage'), mapWrap: byId('mapwrap'), labels: byId('labels'), empty: byId('empty'),
  agentBar: byId('agentbar'), alerts: byId('alerts'), inspector: byId('inspector'), tabPanel: byId('tabpanel'),
  connection: byId('connection'), coinCount: byId('coinCount'), shop: byId<HTMLDialogElement>('shop'),
  musicChip: byId('musicChip'), soundEnabled: byId<HTMLInputElement>('soundEnabled'), soundVolume: byId<HTMLInputElement>('soundVolume')
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 상태 ----------
const agents = new Map<string, AgentSnapshot>();
/** 꾸민 생김새에 상점에서 산 머리 장식을 얹는다 (머리 장식이 역할 소품보다 앞선다) */
const lookWithShopItems = (agent: AgentSnapshot) => {
  const head = equippedOf(agent).head;
  return head ? { ...customLookOf(agent), accessory: head } : customLookOf(agent);
};
const director = new ActorDirector(lookWithShopItems);
const pets = new PetKeeper();
const music = new ClubMusic();
let shopTab: ShopSlot = 'head';
const lightLayer = document.createElement('canvas');
lightLayer.width = MAP_PX_W; lightLayer.height = MAP_PX_H;
const labels = new MapLabels(els.labels);
const floor = paintFloor();
let selectedId: string | null = null;
let renamingId: string | null = null;
/** 꾸미는 중인 에이전트와 고르는 중인 생김새 (저장 전) */
let customizing: { id: string; draft: DollLook } | null = null;
const TIME_MODES: readonly TimeMode[] = ['auto', 'day', 'evening', 'night'];
const timeParam = new URLSearchParams(location.search).get('time') as TimeMode | null;
/** ?time=night 처럼 주소로 시간대를 고정해 열 수도 있다 (캡처·공유용) */
let timeMode: TimeMode = timeParam && TIME_MODES.includes(timeParam) ? timeParam : 'auto';
let tab: LogTab = 'activity';
let connected = false;
let hasSnapshot = false;
let scale = 3;
/** 화면이 켜진 뒤 흐른 시간(초). 애니메이션과 "+코인" 표시 시간에 쓴다 */
let clock = 0;

function applyMessage(message: ServerMessage): void {
  if (message.type === 'wallet') {
    setWallet(message.wallet);
    agents.forEach((agent) => director.refreshLook(agent)); // 머리 장식을 바꿨으면 바로 입힌다
    return;
  }
  if (message.type === 'reward') {
    addCoinPop(message.agentId, message.amount, clock);
    return;
  }
  if (message.type === 'snapshot') {
    agents.clear();
    message.agents.forEach((a) => agents.set(a.id, a));
  } else if (message.type === 'agent') {
    agents.set(message.agent.id, message.agent);
  } else {
    agents.delete(message.id);
  }
  director.sync(agents.values(), message.type === 'snapshot' && !hasSnapshot);
  if (message.type === 'snapshot') hasSnapshot = true;
  if (selectedId && !agents.has(selectedId)) selectedId = null;
  selectedId ??= agents.keys().next().value ?? null;
}

liveSource({ onMessage: applyMessage, onConnectionChange: (value) => { connected = value; } });

// ---------- 화면 갱신 ----------
const nameOf = (id: string) => {
  const agent = agents.get(id);
  return agent ? displayName(agent, agents.values()) : '';
};

function buildViews(): AgentView[] {
  return [...agents.values()]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((agent) => {
      const look = director.actors.get(agent.id)?.look;
      return { agent, name: displayName(agent, agents.values()), look, portrait: look && portraitOf(look) };
    });
}

function refreshPanels(): void {
  const views = buildViews();
  renderAgentBar(els.agentBar, views, selectedId);
  renderAlerts(els.alerts, views, Date.now());
  const selected = views.find((v) => v.agent.id === selectedId);
  if (customizing && selected && customizing.id === selected.agent.id) renderLookEditor(els.inspector, selected, customizing.draft);
  else renderInspector(els.inspector, selected, renamingId === selectedId);
  renderLogTab(els.tabPanel, tab, views, selected);
  els.empty.hidden = agents.size > 0;
  els.connection.textContent = connected ? t('app.connected', { n: agents.size }) : t('app.connecting');
  els.coinCount.textContent = String(currentWallet().coins);
  // 춤추는 캐릭터가 없어지면 음악도 끈다
  const someoneDancing = [...director.actors.values()].some((a) => a.isDancing);
  if (music.isPlaying && !someoneDancing) music.stop();
  els.musicChip.hidden = !music.isPlaying;
  if (els.shop.open) renderShop(els.shop, shopTab, views, selected);
}

/** 언어를 바꾸면 고정 글자와 패널을 다시 그린다 */
function switchLang(next: Lang): void {
  setLang(next);
  applyStaticTexts();
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === next)));
  refreshPanels();
}

function fitToWidth(): void {
  const available = els.mapWrap.clientWidth - 6;
  const raw = available / VIEW_PX.w;
  scale = raw >= 2 ? Math.min(3, Math.floor(raw)) : Math.max(0.6, raw);
  canvas.style.width = `${VIEW_PX.w * scale}px`;
  canvas.style.height = `${VIEW_PX.h * scale}px`;
  els.stage.classList.toggle('small', scale < 1.2);
}

// ---------- 입력 ----------
// 꾸미기 상점: 열기 · 닫기 · 탭 · 사기 · 입히기 · 벗기기 (캐릭터 고르기는 아래 공통 처리의 data-select가 맡는다)
document.addEventListener('click', (event) => {
  if (event.target === els.shop) { els.shop.close(); return; } // 창 바깥(어두운 배경)을 누르면 닫는다
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-shop-open],[data-shop-close],[data-shop-tab],[data-shop-buy],[data-shop-equip],[data-shop-unequip]');
  if (!target) return;
  const selected = selectedId ? agents.get(selectedId) : undefined;
  if (target.hasAttribute('data-shop-open')) els.shop.showModal();
  if (target.hasAttribute('data-shop-close')) els.shop.close();
  if (target.dataset.shopTab === 'head' || target.dataset.shopTab === 'pet') shopTab = target.dataset.shopTab;
  if (target.dataset.shopBuy) void buyItem(target.dataset.shopBuy);
  if (target.dataset.shopEquip && selected) void equipItem(selected, target.dataset.slot as ShopSlot, target.dataset.shopEquip);
  if (target.dataset.shopUnequip && selected) void equipItem(selected, target.dataset.shopUnequip as ShopSlot, null);
  refreshPanels();
});

document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-select],[data-rename],[data-rename-cancel],[data-tab],[data-customize],[data-look-reset],[data-look-cancel],[data-look-preset],[data-time],[data-lang]');
  if (!target) return;
  if (target.dataset.select) { selectedId = target.dataset.select; renamingId = null; stopCustomizing(); }
  if (target.dataset.customize) {
    const actor = director.actors.get(target.dataset.customize);
    if (actor) customizing = { id: actor.id, draft: { ...actor.look.doll } };
  }
  if (target.hasAttribute('data-look-reset') && customizing) {
    const agent = agents.get(customizing.id);
    if (agent) { saveLook(agent, null); director.refreshLook(agent); }
    customizing = null;
  }
  if (target.hasAttribute('data-look-cancel')) stopCustomizing();
  const preset = PRESETS.find((p) => p.id === target.dataset.lookPreset);
  if (preset && customizing) {
    customizing = { ...customizing, draft: { ...preset.look } };
    const actor = director.actors.get(customizing.id);
    if (actor) actor.look = toLook(customizing.draft);
  }
  if (target.dataset.lang === 'ko' || target.dataset.lang === 'en') switchLang(target.dataset.lang);
  if (target.dataset.time) {
    timeMode = target.dataset.time as TimeMode;
    document.querySelectorAll<HTMLElement>('[data-time]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === timeMode)));
  }
  if (target.dataset.rename) renamingId = target.dataset.rename;
  if (target.hasAttribute('data-rename-cancel')) renamingId = null;
  if (target.dataset.tab) {
    tab = target.dataset.tab as LogTab;
    document.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  }
  refreshPanels();
  if (renamingId) byId<HTMLInputElement>('renameInput')?.select();
});

/** 저장하지 않고 꾸미기를 닫으면 저장된(또는 기본) 모습으로 되돌린다 */
function stopCustomizing(): void {
  const agent = customizing && agents.get(customizing.id);
  if (agent) director.refreshLook(agent);
  customizing = null;
}

// 꾸미기: 고르는 즉시 지도 위 캐릭터에 입혀 본다
document.addEventListener('change', (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>('[data-look-form]');
  const actor = form && customizing ? director.actors.get(customizing.id) : undefined;
  if (!form || !customizing || !actor) return;
  customizing = { ...customizing, draft: readLookForm(form, customizing.draft) };
  actor.look = toLook(customizing.draft);
  refreshPanels();
});

document.addEventListener('submit', (event) => {
  const lookForm = (event.target as HTMLElement).closest<HTMLFormElement>('[data-look-form]');
  if (lookForm && customizing) {
    event.preventDefault();
    const agent = agents.get(customizing.id);
    if (agent) saveLook(agent, customizing.draft);
    customizing = null;
    refreshPanels();
    return;
  }
  const form = (event.target as HTMLElement).closest<HTMLFormElement>('[data-rename-form]');
  if (!form) return;
  event.preventDefault();
  const agent = agents.get(form.dataset.renameForm ?? '');
  if (agent) saveName(agent, String(new FormData(form).get('name') ?? ''));
  renamingId = null;
  refreshPanels();
});

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((event.clientX - rect.left) / rect.width) * VIEW_PX.w + VIEW_PX.x;
  const my = ((event.clientY - rect.top) / rect.height) * VIEW_PX.h + VIEW_PX.y;
  const HIT_RADIUS = 20;
  let best: { id: string; distance: number } | null = null;
  for (const actor of director.actors.values()) {
    const box = actorBox(actor);
    const distance = Math.hypot(mx - (box.x + DOLL_W / 2), my - (box.y + DOLL_H / 2));
    if (distance < HIT_RADIUS && (!best || distance < best.distance)) best = { id: actor.id, distance };
  }
  if (best) {
    selectedId = best.id; renamingId = null; stopCustomizing();
    // ??? 방에서 춤추는 캐릭터를 누르면 음악을 켜고 끈다
    if (director.actors.get(best.id)?.isDancing) music.toggle();
    refreshPanels();
  }
});

// ??? 방 음악: 끄기 버튼, 설정 창의 소리 켜기 · 음량
document.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('[data-music-stop]')) { music.stop(); refreshPanels(); }
});
els.soundEnabled.checked = music.settings.enabled;
els.soundVolume.value = String(music.settings.volume);
els.soundEnabled.addEventListener('change', () => { music.setEnabled(els.soundEnabled.checked); refreshPanels(); });
els.soundVolume.addEventListener('input', () => music.setVolume(Number(els.soundVolume.value)));

// ---------- 반복 ----------
closeSettingsOnClickAwayOrEscape(byId<HTMLDetailsElement>('settings'));
document.querySelectorAll<HTMLElement>('[data-time]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === timeMode)));
switchLang(currentLang());
fitToWidth();
new ResizeObserver(fitToWidth).observe(els.mapWrap);
refreshPanels();

let last = performance.now();
let sincePanels = 0;
function frame(now: number): void {
  const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
  last = now;
  clock += dt;
  director.update(dt, agents, Date.now());
  g.setTransform(1, 0, 0, 1, -VIEW_PX.x, -VIEW_PX.y);
  pets.update(dt, director.actors.values(), (id) => { const agent = agents.get(id); return agent && equippedOf(agent).pet; });
  renderOffice({ g, floor, lightLayer, director, agents, selectedId, time: clock, reduceMotion, ambient: ambientAt(timeMode, new Date()), pets: pets.pets.values() });
  labels.update(director, agents, nameOf, scale, VIEW_PX, selectedId, activeCoinPops(clock));
  sincePanels += dt;
  if (sincePanels >= PANEL_REFRESH_SECONDS) { sincePanels = 0; refreshPanels(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
