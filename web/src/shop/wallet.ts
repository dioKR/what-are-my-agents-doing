// 화면 쪽 지갑: 서버가 알려 준 지갑(코인·산 물건·착용)을 들고 있고, 사기·입히기를 서버에 요청한다.
// 코인을 번 순간 캐릭터 머리 위에 띄울 "+코인"도 여기서 관리한다.
import type { AgentSnapshot } from '../../../shared/protocol.ts';
import { EMPTY_WALLET, type Equipped, type ShopSlot, type WalletState } from '../../../shared/shop.ts';
import type { CoinPop } from '../office/labels.ts';
import { profileKey } from '../names.ts';

/** "+코인"이 떠 있는 시간(초). CSS 애니메이션 길이와 같다 */
const COIN_POP_SECONDS = 1.6;

let wallet: WalletState = EMPTY_WALLET;
let pops: Array<CoinPop & { until: number }> = [];
let popSeq = 0;

export const currentWallet = (): WalletState => wallet;
export function setWallet(next: WalletState): void { wallet = next; }

/** 이 에이전트(캐릭터)가 지금 착용한 물건 */
export const equippedOf = (agent: AgentSnapshot): Equipped => wallet.equipped[profileKey(agent)] ?? {};

/** 사기·입히기 요청. 결과 지갑은 서버가 실시간 연결로 다시 보내 준다 */
export async function buyItem(itemId: string): Promise<boolean> {
  return post('/api/shop/buy', { itemId });
}

export async function equipItem(agent: AgentSnapshot, slot: ShopSlot, itemId: string | null): Promise<boolean> {
  return post('/api/shop/equip', { key: profileKey(agent), slot, itemId });
}

async function post(path: string, body: unknown): Promise<boolean> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return res?.ok ?? false;
}

/** clock: 화면이 켜진 뒤 흐른 시간(초) */
export function addCoinPop(agentId: string, amount: number, clock: number): void {
  pops.push({ id: ++popSeq, agentId, amount, until: clock + COIN_POP_SECONDS });
}

export function activeCoinPops(clock: number): CoinPop[] {
  pops = pops.filter((p) => p.until > clock);
  return pops;
}
