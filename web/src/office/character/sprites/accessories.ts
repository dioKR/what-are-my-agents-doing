// 머리 위에 얹는 소품(왕관, 역할 소품, 인턴 새싹)을 한 칸씩 찍은 도트. 숫자·소문자 일부는 소품 전용 색이다.
import type { Accessory } from '../doll.ts';
import type { View } from './types.ts';

export const ACCESSORY_COLORS: Record<string, string> = {
  0: '#2a2232', 1: '#ffd34d', 2: '#e2454f', 3: '#5b8de8', 4: '#7cd36a', 5: '#3f8a3c',
  6: '#c2453a', 7: '#8a2a20', 8: '#2f5fa8', 9: '#1f3f78', j: '#2c4f8a', J: '#1b3360',
  r: '#e2454f', q: '#a8303a', z: '#fff3b0', x: '#8fd3ff', g: '#2a2232', y: '#ffd34d', // y: 우체부 모자 배지
  K: '#2a2d35', G: '#4d5462', M: '#7fe0b4',
  // 상점 물건 색: 분홍 · 진분홍 · 잎 · 노랑꽃 · 산타 빨강 · 털 · 선글라스 알 · 알 반사 · 주황
  u: '#ff7eb6', U: '#c2457e', f: '#5fbf4a', t: '#ffd34d', v: '#d4283c', B: '#f6f4f0', i: '#1c1b24', l: '#6f7fa6', A: '#ff9a3c'
};

/** anchor 'top': 머리카락 맨 윗줄 + dy에 놓는다 */
export interface AccessoryPiece { rows: string[]; dy: number; anchor: 'top' }

const at = (x: number, rows: string[]) => rows.map((r) => '.'.repeat(x) + r);
const same = (piece: AccessoryPiece, sideX: number, frontX: number): Partial<Record<View, AccessoryPiece>> => ({
  down: piece, up: piece, left: { ...piece, rows: piece.rows.map((r) => r.slice(frontX - sideX)) }
});

const crown: AccessoryPiece = { dy: -3, anchor: 'top', rows: at(12, [
  '0..00..0',
  '01011010',
  '01111110',
  '01213110',
  '00000000'
]) };
const beret: AccessoryPiece = { dy: -2, anchor: 'top', rows: at(8, [
  '......00',
  '...00066000',
  '.0666666666600',
  '066666666666660',
  '.0000000000000'
]) };
const cap = (main: string, brim: string, badge: boolean): Partial<Record<View, AccessoryPiece>> => {
  const b = badge ? 'y' : main;
  return {
    down: { dy: -1, anchor: 'top', rows: at(6, [
      '.....00000000',
      '...00' + main.repeat(3) + b + b + main.repeat(3) + '00',
      '..0' + main.repeat(14) + '0',
      '.0' + main.repeat(16) + '0',
      '.0' + brim.repeat(16) + '0',
      '..0000000000000000'
    ]) },
    up: { dy: -1, anchor: 'top', rows: at(6, [
      '.....00000000',
      '...00' + main.repeat(8) + '00',
      '..0' + main.repeat(14) + '0',
      '.0' + main.repeat(16) + '0',
      '.0' + main.repeat(16) + '0',
      '..0000000000000000'
    ]) },
    left: { dy: -1, anchor: 'top', rows: at(2, [
      '.........00000000',
      '.......00' + b + b + main.repeat(6) + '00',
      '......0' + main.repeat(14) + '0',
      '.....0' + main.repeat(16) + '0',
      '0' + brim.repeat(8) + main.repeat(12) + '0',
      '.0000000000000000000'
    ]) }
  };
};
const headphones: Partial<Record<View, AccessoryPiece>> = (() => {
  const front = [
    '............KKKKKKKK',
    '..........KK........KK',
    '........KK............KK',
    '.......K................K',
    '......K..................K',
    '.....K....................K',
    '.....K....................K',
    '....K......................K',
    '.KKKK......................KKKK',
    'KGGGK......................KGGGK',
    'KGMGK......................KGMGK',
    'KGGGK......................KGGGK',
    'KGGGK......................KGGGK',
    '.KKKK......................KKKK'
  ];
  const side = [
    '...............KK',
    '.................K',
    '.................K',
    '..................K',
    '..................K',
    '..................K',
    '..................K',
    '..................K',
    '...............KKKKK',
    '..............KGGGGK',
    '..............KGGGGK',
    '..............KGMMGK',
    '..............KGGGGK',
    '..............KGGGGK',
    '...............KKKK'
  ];
  return { down: { dy: -1, anchor: 'top', rows: front }, up: { dy: -1, anchor: 'top', rows: front }, left: { dy: -1, anchor: 'top', rows: side } };
})();
const ribbon: Partial<Record<View, AccessoryPiece>> = {
  down: { dy: 0, anchor: 'top', rows: at(19, ['.00.00.', '0rr0rr0', '0rrqrr0', '.00.00.']) },
  up: { dy: 0, anchor: 'top', rows: at(6, ['.00.00.', '0rr0rr0', '0rrqrr0', '.00.00.']) },
  left: { dy: 0, anchor: 'top', rows: at(16, ['.00.00.', '0rr0rr0', '0rrqrr0', '.00.00.']) }
};
const starclip: Partial<Record<View, AccessoryPiece>> = {
  down: { dy: 5, anchor: 'top', rows: at(20, ['..0..', '.010.', '01z10', '.101.', '.0.0.']) },
  left: { dy: 5, anchor: 'top', rows: at(16, ['..0..', '.010.', '01z10', '.101.', '.0.0.']) }
};
const sprout: AccessoryPiece = { dy: -4, anchor: 'top', rows: at(13, ['00.00', '0440440'.slice(0, 5), '.454.', '..5..', '..5..']) };

// ---------- 상점 머리 장식 ----------
/** 하트 머리띠: 머리 위를 가로지르는 2줄 띠 + 오른쪽 위 큰 하트 */
const heartBand: AccessoryPiece = { dy: -3, anchor: 'top', rows: [
  '....................00.00',
  '...................0uu0uu0',
  '...................0uwuuu0',
  '...................0uuuuu0',
  '....................0uuu0',
  '.....................0u0',
  '.......UuuuuuuuuuuuuuuuuU',
  '........UUUUUUUUUUUUUUUU'
] };
/** 고양이 귀: 머리색 그대로, 안쪽은 분홍 (H·o는 머리카락 색을 따른다) */
const catEars: AccessoryPiece = { dy: -3, anchor: 'top', rows: [
  '........o............o',
  '.......oHo..........oHo',
  '......oHUHo........oHUHo',
  '......oHUUHo......oHUUHo',
  '.....oHHHHHo......oHHHHHo'
] };
/** 꽃 화관: 잎 사이에 분홍·노랑·흰 꽃 */
const flowerCrown: AccessoryPiece = { dy: 1, anchor: 'top', rows: [
  '.........0..0..0..0..0..0',
  '........0u00t00w00u00t00w0',
  '.......0uUu0ttt0www0uUu0ttt0',
  '.......0fu0ff0t0ff0w0ffu0ff0',
  '........00..00.0..00.00..00'
] };
/** 파티 모자: 줄무늬 고깔 + 꼭대기 방울 */
const partyHat: AccessoryPiece = { dy: -6, anchor: 'top', rows: [
  '..............000',
  '..............0w0',
  '..............000',
  '..............0u0',
  '.............0tu0',
  '.............0ut0',
  '............0uutt0',
  '............0ttuu0',
  '...........0uuttuu0',
  '..........000000000'
] };
/** 산타 모자: 머리를 덮는 빨간 모자, 오른쪽으로 늘어진 끝과 흰 방울, 아래 흰 털 테 */
const santaHat: AccessoryPiece = { dy: -5, anchor: 'top', rows: [
  '..........00000v00000',
  '.........0vvvvvvvvvvv0...0',
  '.......00vvvvvvvvvvvvv000v0',
  '......0vvvvvuuvvvvvvvvvv0vv0',
  '......0vvvuuvvvvvvvvvvvv00v0',
  '.....0vvvuvvvvvvvvvvvvvvv0B0',
  '.....0vvvvvvvvvvvvvvvvvvvBBB0',
  '.....0vvvvvvvvvvvvvvvvvvvBBB0',
  '.....0BBBBBBBBBBBBBBBBBBBBB0',
  '.....0BBBBBBBBBBBBBBBBBBBB0'
] };

/** 안경·선글라스는 눈 자리를 따라 그려야 해서 여기 없다 (compose.ts가 그린다) */
export const ACCESSORY_ART: Partial<Record<Accessory, Partial<Record<View, AccessoryPiece>>>> = {
  crown: same(crown, 11, 12),
  beret: same(beret, 7, 8),
  cap: cap('8', '9', false),
  mailcap: cap('j', 'J', true),
  headphones,
  ribbon,
  starclip,
  sprout: same(sprout, 12, 13),
  heartBand: same(heartBand, 5, 7),
  catEars: { down: catEars, up: catEars, left: { ...catEars, rows: catEars.rows.map((r) => r.slice(2)) } },
  flowerCrown: same(flowerCrown, 5, 7),
  partyHat: same(partyHat, 11, 12),
  santaHat: same(santaHat, 3, 5)
};

/** 당황했을 때 머리 옆에 맺히는 땀방울 */
export const SWEAT = at(25, ['.x', 'xx', 'xx']);
