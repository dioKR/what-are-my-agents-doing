// 꾸미기 상점: 파는 물건과 값, 에이전트가 일해서 코인을 버는 규칙, 지갑 모양.
// 서버(코인 계산·저장)와 화면(상점·착용)이 함께 쓴다. 실제 돈 결제는 없다.

export type ShopSlot = 'head' | 'pet';

/** 머리에 쓰는 물건 (캐릭터 그림의 소품 자리에 그린다) */
export type HeadItem = 'heartBand' | 'catEars' | 'flowerCrown' | 'partyHat' | 'santaHat' | 'sunglasses';
/** 캐릭터를 따라다니는 펫 */
export type PetItem = 'cat' | 'dog' | 'slime' | 'chick';
export type ShopItemId = HeadItem | PetItem;

export interface ShopItem {
  id: ShopItemId;
  slot: ShopSlot;
  price: number;
  label: { ko: string; en: string };
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'heartBand', slot: 'head', price: 20, label: { ko: '하트 머리띠', en: 'Heart headband' } },
  { id: 'sunglasses', slot: 'head', price: 25, label: { ko: '선글라스', en: 'Sunglasses' } },
  { id: 'catEars', slot: 'head', price: 30, label: { ko: '고양이 귀', en: 'Cat ears' } },
  { id: 'flowerCrown', slot: 'head', price: 40, label: { ko: '꽃 화관', en: 'Flower crown' } },
  { id: 'partyHat', slot: 'head', price: 40, label: { ko: '파티 모자', en: 'Party hat' } },
  { id: 'santaHat', slot: 'head', price: 50, label: { ko: '산타 모자', en: 'Santa hat' } },
  { id: 'chick', slot: 'pet', price: 60, label: { ko: '병아리', en: 'Chick' } },
  { id: 'slime', slot: 'pet', price: 80, label: { ko: '슬라임', en: 'Slime' } },
  { id: 'cat', slot: 'pet', price: 120, label: { ko: '고양이', en: 'Cat' } },
  { id: 'dog', slot: 'pet', price: 120, label: { ko: '강아지', en: 'Dog' } }
];

export const shopItem = (id: string): ShopItem | undefined => SHOP_ITEMS.find((item) => item.id === id);

/** 코인을 버는 일과 그때 받는 코인 */
export type RewardReason = 'turn' | 'todo' | 'push' | 'pr' | 'teamTask';
export const REWARD_COINS: Record<RewardReason, number> = {
  turn: 1, // 일을 하다가 한 턴을 끝까지 마침
  todo: 3, // 할 일 목록에서 하나를 끝냄
  push: 5, // git push에 성공함 (PR 없이 바로 올리는 경우도 셈, #19)
  pr: 10, // PR을 올림 (PR 주소를 알려 줌)
  teamTask: 5 // 에이전트 팀의 할 일 하나를 끝냄
};

export interface EarnedCoins {
  at: number;
  agentId: string;
  /** 번 에이전트의 이름 (세션 제목이나 폴더 이름) */
  who: string;
  reason: RewardReason;
  amount: number;
}

/** 캐릭터 한 명이 지금 착용한 물건 */
export interface Equipped { head?: HeadItem; pet?: PetItem }

export interface WalletState {
  coins: number;
  owned: ShopItemId[];
  /** 착용 정보. 키는 화면이 정한 캐릭터 기준(도구 + 작업 폴더) */
  equipped: Record<string, Equipped>;
  /** 최근에 번 코인 (최신이 앞) */
  recent: EarnedCoins[];
}

export const EMPTY_WALLET: WalletState = { coins: 0, owned: [], equipped: {}, recent: [] };
