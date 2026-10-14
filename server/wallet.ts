// 지갑: 에이전트가 한 일로 코인을 주고, 상점에서 사고, 캐릭터에 입힌다.
// 계산은 순수 함수로 두고(테스트하기 쉽게), 파일 저장은 WalletStore가 맡는다 (~/.wamad/wallet.json).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { AgentSnapshot } from '../shared/protocol.ts';
import { EMPTY_WALLET, REWARD_COINS, shopItem, type EarnedCoins, type Equipped, type RewardReason, type ShopSlot, type WalletState } from '../shared/shop.ts';
import type { ClaudeHookPayload } from './claudeHook.ts';

const MAX_RECENT = 20;
const SAVE_DELAY_MS = 500;
const WORKING: ReadonlySet<AgentSnapshot['activity']> = new Set(['working', 'thinking']);

/** 이벤트 하나로 상태가 prev → next로 바뀔 때 받을 코인 (같은 이유가 여러 번이면 여러 개) */
export function rewardsFor(prev: AgentSnapshot | undefined, next: AgentSnapshot, event: ClaudeHookPayload): RewardReason[] {
  const reasons: RewardReason[] = [];
  if (event.hook_event_name === 'Stop' && prev && WORKING.has(prev.activity)) reasons.push('turn');
  if (event.hook_event_name === 'TaskCompleted' && prev?.teamTasks.some((t) => t.id === event.task_id && t.status === 'open')) reasons.push('teamTask');
  // 할 일: 이번에 새로 '완료'가 된 항목만 센다
  const doneBefore = new Set((prev?.todos ?? []).filter((t) => t.status === 'completed').map((t) => t.content));
  for (const todo of next.todos) if (todo.status === 'completed' && !doneBefore.has(todo.content)) reasons.push('todo');
  // PR: 처음 알려 준 PR 주소만 센다
  const knownPrs = new Set((prev?.links ?? []).filter((l) => l.kind === 'pr').map((l) => l.url));
  for (const link of next.links) if (link.kind === 'pr' && !knownPrs.has(link.url)) reasons.push('pr');
  return reasons;
}

export function earn(state: WalletState, agentId: string, who: string, reasons: RewardReason[], at: number): { state: WalletState; earned: EarnedCoins[] } {
  const earned = reasons.map((reason) => ({ at, agentId, who, reason, amount: REWARD_COINS[reason] }));
  const total = earned.reduce((sum, e) => sum + e.amount, 0);
  return { state: { ...state, coins: state.coins + total, recent: [...[...earned].reverse(), ...state.recent].slice(0, MAX_RECENT) }, earned };
}

export type ShopResult = { ok: true; state: WalletState } | { ok: false; error: 'unknown-item' | 'not-enough-coins' | 'already-owned' | 'not-owned' | 'wrong-slot' };

export function buy(state: WalletState, itemId: string): ShopResult {
  const item = shopItem(itemId);
  if (!item) return { ok: false, error: 'unknown-item' };
  if (state.owned.includes(item.id)) return { ok: false, error: 'already-owned' };
  if (state.coins < item.price) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: { ...state, coins: state.coins - item.price, owned: [...state.owned, item.id] } };
}

/** 캐릭터(key)의 slot에 산 물건을 입히거나, itemId가 null이면 벗긴다 */
export function equip(state: WalletState, key: string, slot: ShopSlot, itemId: string | null): ShopResult {
  const current: Equipped = { ...state.equipped[key] };
  if (itemId === null) {
    delete current[slot];
  } else {
    const item = shopItem(itemId);
    if (!item) return { ok: false, error: 'unknown-item' };
    if (item.slot !== slot) return { ok: false, error: 'wrong-slot' };
    if (!state.owned.includes(item.id)) return { ok: false, error: 'not-owned' };
    Object.assign(current, { [slot]: item.id });
  }
  const equipped = { ...state.equipped };
  if (Object.keys(current).length) equipped[key] = current;
  else delete equipped[key];
  return { ok: true, state: { ...state, equipped } };
}

/** 지갑 파일을 읽고 쓴다. 바뀔 때마다 조금 모았다가 저장한다 */
export class WalletStore {
  state: WalletState = EMPTY_WALLET;
  private readonly path: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(path = join(homedir(), '.wamad', 'wallet.json')) {
    this.path = path;
  }

  async load(): Promise<void> {
    try {
      this.state = { ...EMPTY_WALLET, ...(JSON.parse(await readFile(this.path, 'utf8')) as Partial<WalletState>) };
    } catch {
      this.state = EMPTY_WALLET; // 처음 쓰거나 파일이 깨졌으면 빈 지갑
    }
  }

  set(next: WalletState): void {
    this.state = next;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(), SAVE_DELAY_MS);
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.state, null, 2));
  }
}
