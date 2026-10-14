// 에이전트 생김새. 기본은 네 캐릭터(분홍 · 하얀 · 갈색 · 검은 머리 사원)가 차례로 나오고, 사용자가 꾸민 값이 있으면 그 위에 덮는다.
import { shade } from './character/pixelSheet.ts';
import type { Accessory, DollLook, EyeStyle, FaceMark, HairStyle, Outfit } from './character/doll.ts';

/** 화면 언어별 이름 */
export interface Label { ko: string; en: string }

export interface Look {
  doll: DollLook;
  /** 이 캐릭터의 대표 색(눈 색). 작업 보드 카드와 이불 색에 쓴다 */
  accent: string;
  accentLight: string;
}

// ---------- 기본 캐릭터 ----------
export const PRESETS: Array<{ id: string; label: Label; look: DollLook }> = [
  {
    id: 'pink', label: { ko: '분홍 머리 사원', en: 'Pink-haired staffer' },
    look: { character: 'pink', skin: '#fbe3d4', hair: '#f08aa8', hairStyle: 'princess', eyes: '#e2456f', eyeStyle: 'heart', outfit: 'blouseSkirt', shirt: '#f4f2ee', pants: '#3a3436', accessory: 'none' }
  },
  {
    id: 'white', label: { ko: '하얀 머리 사원', en: 'White-haired staffer' },
    look: { character: 'white', skin: '#fbe6da', hair: '#eceff4', hairStyle: 'fluffy', eyes: '#e09a2c', eyeStyle: 'round', outfit: 'shirtTie', shirt: '#f6f6f6', pants: '#26262c', accessory: 'none' }
  },
  {
    // 눈을 덮는 갈색 앞머리, 헤드폰, 볼 반창고, 회색 후드티
    id: 'brown', label: { ko: '갈색 머리 사원', en: 'Brown-haired staffer' },
    look: { character: 'brown', skin: '#fbe3d4', hair: '#c4945e', hairStyle: 'shaggy', eyes: '#8a5a2e', eyeStyle: 'round', outfit: 'hoodie', shirt: '#d9dbe0', pants: '#2c3446', accessory: 'headphones', mark: 'bandage' }
  },
  {
    // 끝을 붉게 물들인 단발, 빨간 눈, 흰 티셔츠와 명찰, 은 귀걸이
    id: 'black', label: { ko: '검은 머리 사원', en: 'Black-haired staffer' },
    look: { character: 'black', skin: '#fbe6da', hair: '#4a2e26', hairStyle: 'dyedBob', eyes: '#d0283a', eyeStyle: 'round', outfit: 'staffTee', shirt: '#f4f2ee', pants: '#26262c', accessory: 'none', mark: 'earrings' }
  }
];
/** 다섯 번째부터는 같은 네 캐릭터를 머리색·눈색만 바꿔 쓴다 */
const VARIANTS: Array<Pick<DollLook, 'hair' | 'eyes'>> = [
  { hair: '#b9a3f0', eyes: '#6a5ad0' }, { hair: '#2b2b30', eyes: '#5b8de8' },
  { hair: '#8fd3c0', eyes: '#2f9a6d' }, { hair: '#6b3f1f', eyes: '#c9503f' }
];

// ---------- 꾸미기 선택지 ----------
export const HAIR_STYLES: Array<{ value: HairStyle; label: Label }> = [
  { value: 'princess', label: { ko: '공주 머리', en: 'Princess' } }, { value: 'fluffy', label: { ko: '곱슬 머리', en: 'Fluffy' } }, { value: 'short', label: { ko: '짧은 머리', en: 'Short' } },
  { value: 'spiky', label: { ko: '뾰족 머리', en: 'Spiky' } }, { value: 'bob', label: { ko: '단발', en: 'Bob' } }, { value: 'long', label: { ko: '긴 머리', en: 'Long' } },
  { value: 'ponytail', label: { ko: '포니테일', en: 'Ponytail' } }, { value: 'buns', label: { ko: '똥머리', en: 'Buns' } },
  { value: 'shaggy', label: { ko: '덥수룩 머리', en: 'Shaggy' } }, { value: 'dyedBob', label: { ko: '투톤 단발', en: 'Two-tone bob' } }
];
export const OUTFITS: Array<{ value: Outfit; label: Label }> = [
  { value: 'blouseSkirt', label: { ko: '블라우스·치마', en: 'Blouse & skirt' } }, { value: 'shirtTie', label: { ko: '셔츠·넥타이', en: 'Shirt & tie' } }, { value: 'tee', label: { ko: '티셔츠', en: 'T-shirt' } },
  { value: 'hoodie', label: { ko: '후드티', en: 'Hoodie' } }, { value: 'staffTee', label: { ko: '명찰 티셔츠', en: 'Staff tee' } }
];
export const EYE_STYLES: Array<{ value: EyeStyle; label: Label }> = [{ value: 'round', label: { ko: '동그란 눈', en: 'Round' } }, { value: 'heart', label: { ko: '하트 눈', en: 'Heart' } }];
export const HAIR_COLORS = ['#f08aa8', '#eceff4', '#c4945e', '#4a2e26', '#b9a3f0', '#2b2b30', '#6b3f1f', '#d9b36a', '#8fd3c0', '#c9503f'];
export const EYE_COLORS = ['#e2456f', '#e09a2c', '#8a5a2e', '#d0283a', '#6a5ad0', '#5b8de8', '#2f9a6d'];
export const SKIN_TONES = ['#fbe3d4', '#f6d3ad', '#e0ac7e', '#c68a5e', '#8d5a3b'];
export const SHIRT_COLORS = ['#f4f2ee', '#d9dbe0', '#e07a3c', '#2f9a6d', '#5b8de8', '#c95a8a', '#8a6bd1', '#e6b450', '#4a5260'];
export const PANTS_COLORS = ['#3a3436', '#26262c', '#2c3446', '#2c3e50', '#5a4636', '#6b7480'];
export const ACCESSORIES: Array<{ value: Accessory; label: Label }> = [
  { value: 'none', label: { ko: '없음', en: 'None' } }, { value: 'beret', label: { ko: '베레모', en: 'Beret' } }, { value: 'headphones', label: { ko: '헤드폰', en: 'Headphones' } },
  { value: 'cap', label: { ko: '모자', en: 'Cap' } }, { value: 'glasses', label: { ko: '안경', en: 'Glasses' } }, { value: 'ribbon', label: { ko: '리본', en: 'Ribbon' } }, { value: 'starclip', label: { ko: '별 핀', en: 'Star pin' } }
];

export const FACE_MARKS: Array<{ value: FaceMark; label: Label }> = [
  { value: 'none', label: { ko: '없음', en: 'None' } }, { value: 'bandage', label: { ko: '반창고', en: 'Bandage' } }, { value: 'earrings', label: { ko: '귀걸이', en: 'Earrings' } }
];

/** index: 몇 번째로 나타난 에이전트인지 (0부터). custom: 사용자가 꾸민 값 */
export function lookFor(index: number, custom?: Partial<DollLook>): Look {
  const preset = PRESETS[index % PRESETS.length].look;
  const round = Math.floor(index / PRESETS.length);
  const variant = round === 0 ? {} : VARIANTS[(round - 1) % VARIANTS.length];
  return toLook({ ...preset, ...variant, ...custom });
}

export function toLook(doll: DollLook): Look {
  return { doll, accent: doll.eyes, accentLight: shade(doll.eyes, 0.4) };
}

export function subagentLook(parent: Look): Look {
  return toLook({ ...parent.doll, accessory: 'sprout' });
}

/** 배달부: 하얀 머리 사원 그림에 갈색 머리 · 파란 셔츠 · 우체부 모자를 입힌다 */
export const COURIER_LOOK: Look = toLook({
  character: 'white', skin: '#e0ac7e', hair: '#5a3a22', hairStyle: 'short', eyes: '#5a3a22', eyeStyle: 'round', outfit: 'tee', shirt: '#2c4f8a', pants: '#2c3e50', accessory: 'mailcap'
});
