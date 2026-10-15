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
import { renderShop } from './shop/shopPanel.ts';
import { renderRecords, setRecords } from './records/recordsPanel.ts';
import { deleteSheet, downloadSheetTemplate, syncCustomCharacters, uploadSheet, type UploadResult } from './characters/library.ts';
import { SHEET_CHARACTER_PREFIX } from '../../shared/characterSheet.ts';
import { askOf, decide, setApprovalAsks, setApprovalsEnabled, setAppSettings } from './approvals/approvals.ts';
import { closeAgentMenu, moveMenuFocus, openAgentMenu } from './panels/agentMenu.ts';
import { MapCamera } from './office/mapCamera.ts';
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
// 데스크톱 앱에는 터미널 명령이 없으니, 훅 설치를 앱 아이콘 메뉴로 안내한다
const isDesktopApp = navigator.userAgent.includes('Electron/');
if (isDesktopApp) byId('hookStep').dataset.i18n = 'empty.step2.desktop';

const els = {
  stage: byId('stage'), mapWrap: byId('mapwrap'), labels: byId('labels'), empty: byId('empty'),
  agentBar: byId('agentbar'), alerts: byId('alerts'), inspector: byId('inspector'), tabPanel: byId('tabpanel'),
  connection: byId('connection'), coinCount: byId('coinCount'), shop: byId<HTMLDialogElement>('shop'), records: byId<HTMLDialogElement>('records'), agentMenu: byId('agentMenu')
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
let shopTab: ShopSlot = 'head';
const lightLayer = document.createElement('canvas');
lightLayer.width = MAP_PX_W; lightLayer.height = MAP_PX_H;
// 확대 · 이동하면 떠 있던 오른쪽 클릭 메뉴는 자리가 맞지 않으니 닫는다
const mapCamera = new MapCamera(canvas, { w: VIEW_PX.w, h: VIEW_PX.h }, () => closeAgentMenu(els.agentMenu));
const labels = new MapLabels(els.labels);
const floor = paintFloor();
let selectedId: string | null = null;
let renamingId: string | null = null;
/** 꾸미는 중인 에이전트와 고르는 중인 생김새 (저장 전) */
let customizing: { id: string; draft: DollLook } | null = null;
/** 캐릭터 시트를 올린 결과 한 줄. 꾸미기를 닫으면 지운다 */
let sheetStatus: string | null = null;
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
  if (message.type === 'settings') {
    setAppSettings(message.settings);
    byId<HTMLInputElement>('approvalsEnabled').checked = message.settings.approvals;
    return;
  }
  if (message.type === 'approvals') {
    setApprovalAsks(message.asks);
    return;
  }
  if (message.type === 'characters') {
    // 시트 그림을 다 불러오면 지도 · 카드의 캐릭터를 다시 그린다
    syncCustomCharacters(message.characters, refreshPanels);
    return;
  }
  if (message.type === 'records') {
    setRecords(message.records);
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

const viewOf = (id: string): AgentView | undefined => buildViews().find((v) => v.agent.id === id);

function refreshPanels(): void {
  const views = buildViews();
  renderAgentBar(els.agentBar, views, selectedId);
  renderAlerts(els.alerts, views, Date.now());
  const selected = views.find((v) => v.agent.id === selectedId);
  if (customizing && selected && customizing.id === selected.agent.id) renderLookEditor(els.inspector, selected, customizing.draft, sheetStatus);
  else renderInspector(els.inspector, selected, renamingId === selectedId);
  renderLogTab(els.tabPanel, tab, views, selected);
  els.empty.hidden = agents.size > 0;
  els.connection.textContent = connected ? t('app.connected', { n: agents.size }) : t('app.connecting');
  els.coinCount.textContent = String(currentWallet().coins);
  if (els.shop.open) renderShop(els.shop, shopTab, views, selected);
  if (els.records.open) renderRecords(els.records, views, Date.now());
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
  mapCamera.setFitScale(scale);
}

// ---------- 입력 ----------
// 지도 확대 · 축소 · 맞추기 단추 (끌기 · 핀치는 MapCamera가 맡는다)
document.addEventListener('click', (event) => {
  const zoom = (event.target as HTMLElement).closest<HTMLElement>('[data-zoom]')?.dataset.zoom;
  if (zoom === 'in') mapCamera.zoomIn();
  if (zoom === 'out') mapCamera.zoomOut();
  if (zoom === 'reset') mapCamera.reset();
});

// 기록실: 열기 · 닫기
document.addEventListener('click', (event) => {
  if (event.target === els.records) { els.records.close(); return; } // 창 바깥(어두운 배경)을 누르면 닫는다
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-records-open],[data-records-close]');
  if (!target) return;
  if (target.hasAttribute('data-records-open')) els.records.showModal();
  else els.records.close();
  refreshPanels();
});

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
  if (preset) tryOn({ ...preset.look });
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

/** 꾸미는 중인 캐릭터에 저장 전 모습을 입혀 본다 */
function tryOn(draft: DollLook): void {
  if (!customizing) return;
  customizing = { ...customizing, draft };
  const actor = director.actors.get(customizing.id);
  if (actor) actor.look = toLook(draft);
}

/** 저장하지 않고 꾸미기를 닫으면 저장된(또는 기본) 모습으로 되돌린다 */
function stopCustomizing(): void {
  const agent = customizing && agents.get(customizing.id);
  if (agent) director.refreshLook(agent);
  customizing = null;
  sheetStatus = null;
}

// 앱에서 허용 · 거부 (결과는 서버가 실시간 연결로 다시 알려 준다)
document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-approve],[data-deny],[data-approvals-enable]');
  if (!target) return;
  if (target.dataset.approve) void decide(target.dataset.approve, 'allow');
  if (target.dataset.deny) void decide(target.dataset.deny, 'deny');
  if (target.hasAttribute('data-approvals-enable')) void setApprovalsEnabled(true);
});
byId<HTMLInputElement>('approvalsEnabled').addEventListener('change', (event) => {
  void setApprovalsEnabled((event.target as HTMLInputElement).checked);
});

// 캐릭터 시트: 올린 캐릭터 입혀 보기 · 지우기 · 템플릿 내려받기
document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-look-sheet],[data-sheet-delete],[data-sheet-template]');
  if (!target || !customizing) return;
  if (target.dataset.lookSheet) tryOn({ ...customizing.draft, character: `${SHEET_CHARACTER_PREFIX}${target.dataset.lookSheet}` });
  if (target.dataset.sheetDelete) void deleteSheet(target.dataset.sheetDelete);
  if (target.hasAttribute('data-sheet-template')) downloadSheetTemplate(customizing.draft);
  refreshPanels();
});

// 캐릭터 시트 올리기: 검사를 통과하면 올린 캐릭터를 바로 입혀 본다
document.addEventListener('change', (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-sheet-upload]');
  const file = input?.files?.[0];
  if (!file) return;
  void uploadSheet(file).then((result) => {
    sheetStatus = uploadMessage(result);
    if (result.ok && customizing) tryOn({ ...customizing.draft, character: `${SHEET_CHARACTER_PREFIX}${result.character.id}` });
    refreshPanels();
  });
});

function uploadMessage(result: UploadResult): string {
  if (result.ok) return t('look.sheetOk', { name: result.character.name });
  if (result.error === 'missing-cells') return t('look.sheetMissing', { cells: result.missing.join(', ') });
  if (result.error === 'wrong-size') return t('look.sheetWrongSize');
  if (result.error === 'not-image') return t('look.sheetNotImage');
  return t('look.sheetServer');
}

// 꾸미기: 고르는 즉시 지도 위 캐릭터에 입혀 본다
document.addEventListener('change', (event) => {
  if ((event.target as HTMLElement).hasAttribute('data-sheet-upload')) return; // 시트 올리기는 위에서 따로 처리한다
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
    sheetStatus = null;
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

/** 지도에서 누른 곳에 있는 캐릭터 (가장 가까운 하나) */
function actorIdAt(event: MouseEvent): string | null {
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
  return best?.id ?? null;
}

canvas.addEventListener('click', (event) => {
  const id = actorIdAt(event);
  if (id) { selectedId = id; renamingId = null; stopCustomizing(); refreshPanels(); }
});

// 오른쪽 클릭 메뉴: 지도 위 캐릭터와 위쪽 카드에서 연다
document.addEventListener('contextmenu', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLElement>('.agentcard[data-select]');
  const id = event.target === canvas ? actorIdAt(event) : card?.dataset.select ?? null;
  const view = id ? viewOf(id) : undefined;
  if (!view) { closeAgentMenu(els.agentMenu); return; }
  event.preventDefault();
  selectedId = view.agent.id;
  refreshPanels();
  openAgentMenu(els.agentMenu, view, askOf(view.agent.id), event.clientX, event.clientY);
});

// 메뉴 항목을 누르면 (항목 자체의 동작은 위의 공통 처리가 맡는다) 메뉴를 닫는다. 메뉴 밖을 눌러도 닫는다
document.addEventListener('click', (event) => {
  if (els.agentMenu.hidden) return;
  const target = event.target as HTMLElement;
  const dismiss = target.closest<HTMLElement>('[data-dismiss]')?.dataset.dismiss;
  const folder = target.closest<HTMLElement>('[data-open-folder]')?.dataset.openFolder;
  if (dismiss) void postAgentAction('dismiss', dismiss);
  if (folder) void postAgentAction('open-folder', folder);
  closeAgentMenu(els.agentMenu);
});
els.agentMenu.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); moveMenuFocus(els.agentMenu, event.key === 'ArrowDown' ? 1 : -1); }
  if (event.key === 'Escape' || event.key === 'Tab') closeAgentMenu(els.agentMenu);
});
window.addEventListener('resize', () => closeAgentMenu(els.agentMenu));
window.addEventListener('scroll', () => closeAgentMenu(els.agentMenu), true);

async function postAgentAction(action: 'dismiss' | 'open-folder', id: string): Promise<void> {
  await fetch(`/api/agents/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
}

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
  const view = mapCamera.labelFrame();
  labels.update(director, agents, nameOf, view.scale, { x: VIEW_PX.x + view.x, y: VIEW_PX.y + view.y }, selectedId, activeCoinPops(clock));
  sincePanels += dt;
  if (sincePanels >= PANEL_REFRESH_SECONDS) { sincePanels = 0; refreshPanels(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
