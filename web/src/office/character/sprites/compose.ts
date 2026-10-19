// 손으로 찍은 부품(머리 · 몸통 · 팔 · 다리 · 소품)을 겹쳐 캐릭터 한 장(32×40)을 만든다.
// 글자 → 색은 사용자가 고른 생김새(머리색, 눈색, 옷 색 등)로 정하므로, 같은 그림을 다른 색으로 쓸 수 있다.
import { shade } from '../pixelSheet.ts';
import type { Accessory, DollLook, Expression, Facing, Pose } from '../doll.ts';
import { ACCESSORY_ART, ACCESSORY_COLORS, SWEAT } from './accessories.ts';
import { ARMS, LEGS, SEATED_LEGS_SIDE, TORSO } from './parts.ts';
import type { ArmPose, Box, CharacterArt, StepPose, View } from './types.ts';

export const SPRITE_W = 32;
/** 그림 위 4줄은 왕관 · 새싹 · 들어 올린 손이 들어갈 여백이다. 부품 좌표는 이 여백 아래부터 센다. */
const TOP = 4;
export const SPRITE_H = 40 + TOP;
/** 발바닥 바로 아래 줄 (지도 바닥에 맞추는 줄) */
export const SPRITE_FOOT_Y = 38 + TOP;
const LEGS_TOP = 32;
const TORSO_TOP = 23;
/** 반팔이면 이 줄부터 아래 소매를 피부로 칠한다 */
const SHORT_SLEEVE_FROM = 27;

const STEP_OF: Partial<Record<Pose, StepPose>> = { walk1: 'step1', walk2: 'step2' };
const ARM_OF: Record<Pose, ArmPose> = {
  stand: 'down', sit: 'down', walk1: 'swing1', walk2: 'swing2', type1: 'type1', type2: 'type2',
  think: 'chin', drink: 'chin', raise: 'raise', stretch: 'up', carry: 'up', jelly1: 'waveLeftUp', jelly2: 'spread', jelly3: 'waveRightUp'
};

type Grid = string[][];

/** 밝은 색일수록 테두리를 더 진하게 한다 (흰 머리 · 흰 셔츠도 윤곽이 또렷하게) */
function outlineOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return shade(hex, -0.45 - 0.27 * luminance);
}

export function paletteOf(art: CharacterArt, look: DollLook): Record<string, string> {
  return {
    // 머리카락
    o: outlineOf(look.hair), d: shade(look.hair, -0.2), H: look.hair, h: shade(look.hair, 0.3),
    // 피부 · 볼 · 입
    s: look.skin, k: shade(look.skin, -0.05), p: shade(look.skin, -0.42), b: '#f7aaa4', m: '#c2584f',
    // 눈
    E: look.eyes, e: shade(look.eyes, -0.55), w: '#ffffff',
    // 윗옷
    O: outlineOf(look.shirt), c: shade(look.shirt, -0.18), C: look.shirt, L: shade(look.shirt, 0.45),
    // 바지 · 신발
    P: look.pants, R: shade(look.pants, -0.18), Q: shade(look.pants, -0.45), S: '#3b3238', T: '#eef0f3',
    ...ACCESSORY_COLORS,
    ...art.fixed
  };
}

/** 위 칸 위에 아래 칸을 덧칠한다 ('.'은 건너뜀). remap으로 글자를 바꿔 칠할 수 있다. */
function stamp(grid: Grid, rows: string[], top: number, remap?: (ch: string, y: number) => string): void {
  rows.forEach((row, i) => {
    const y = TOP + top + i;
    if (!grid[y]) return;
    [...row].forEach((ch, x) => {
      if (ch === '.' || x >= SPRITE_W) return;
      grid[y][x] = remap ? remap(ch, y - TOP) : ch;
    });
  });
}

const BARE_LEG: Record<string, string> = { P: 's', R: 'k', Q: 'p' };
const SHORT_SLEEVE: Record<string, string> = { C: 's', c: 'k', O: 'p' };

function headWithExpression(art: CharacterArt, view: View, expression: Expression): string[] {
  const rows = art.head[view].map((r) => [...r]);
  if (view === 'up') return rows.map((r) => r.join(''));
  const eyes = art.eyes[view];
  const mouth = art.mouth[view];
  const set = (x: number, y: number, ch: string) => { if (rows[y]?.[x] !== undefined) rows[y][x] = ch; };
  const clear = (b: Box) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, 's'); };
  for (const eye of eyes) {
    const bottom = eye.y + eye.h - 1;
    switch (expression) {
      case 'blink': case 'sleepy':
        clear(eye);
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, bottom, 'e');
        break;
      case 'happy':
        // 웃는 눈: 가운데가 솟은 반달
        clear(eye);
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, bottom - 1, 'e');
        set(eye.x - 1, bottom, 'e'); set(eye.x + eye.w, bottom, 'e');
        break;
      case 'focus':
        // 집중: 위쪽을 덮어 눈을 가늘게
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, eye.y, 'e');
        for (let x = eye.x; x < eye.x + eye.w; x++) if (eye.h > 2) set(x, eye.y + 1, 'e');
        break;
      case 'panic':
        for (let y = eye.y; y <= bottom; y++) for (let x = eye.x; x < eye.x + eye.w; x++) set(x, y, 'w');
        set(eye.x, eye.y + 1, 'e');
        break;
      case 'cry': {
        // 꼭 감은 눈(아래로 휜 줄) 아래로 눈물 두 방울 (x: 하늘색)
        clear(eye);
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, bottom - 1, 'e');
        set(eye.x - 1, bottom, 'e'); set(eye.x + eye.w, bottom, 'e');
        const tearX = eye.x + Math.floor(eye.w / 2);
        set(tearX, bottom, 'x'); set(tearX, bottom + 1, 'x');
        break;
      }
      case 'surprised':
        // 크게 뜬 눈: 눈 칸 위 한 줄을 속눈썹으로 올리고, 눈 안에 흰 반짝임
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, eye.y - 1, 'e');
        set(eye.x, eye.y, 'w');
        break;
      case 'proud': {
        // 별 눈: 가운데 줄 · 가운데 칸을 눈동자 색으로, 한가운데 흰 점
        clear(eye);
        const cx = eye.x + Math.floor((eye.w - 1) / 2);
        const cy = eye.y + Math.floor((eye.h - 1) / 2);
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, cy, 'E');
        for (let y = eye.y; y <= bottom; y++) set(cx, y, 'E');
        set(cx, cy, 'w');
        break;
      }
      case 'tired':
        // 반쯤 감은 눈: 윗부분을 피부로 덮고 그 경계를 눈꺼풀 줄로
        for (let y = eye.y; y < eye.y + Math.floor(eye.h / 2); y++) for (let x = eye.x; x < eye.x + eye.w; x++) set(x, y, 's');
        for (let x = eye.x; x < eye.x + eye.w; x++) set(x, eye.y + Math.floor(eye.h / 2), 'e');
        break;
      case 'normal':
        break;
    }
  }
  if (expression === 'cry') { for (let x = mouth.x; x < mouth.x + mouth.w; x++) set(x, mouth.y, 'm'); set(mouth.x - 1, mouth.y + 1, 'm'); set(mouth.x + mouth.w, mouth.y + 1, 'm'); }
  if (expression === 'surprised') { for (let x = mouth.x; x < mouth.x + Math.max(2, mouth.w); x++) { set(x, mouth.y, 'm'); set(x, mouth.y + 1, 'm'); } }
  if (expression === 'tired') { for (let x = mouth.x; x < mouth.x + mouth.w; x++) set(x, mouth.y, 'p'); }
  if (expression === 'happy' || expression === 'proud') { for (let x = mouth.x; x < mouth.x + mouth.w; x++) set(x, mouth.y, 'm'); set(mouth.x - 1, mouth.y - 1, 'm'); set(mouth.x + mouth.w, mouth.y - 1, 'm'); }
  if (expression === 'panic') { for (let x = mouth.x; x < mouth.x + Math.max(2, mouth.w); x++) { set(x, mouth.y, 'e'); set(x, mouth.y + 1, 'e'); } }
  return rows.map((r) => r.join(''));
}

function accessoryLayer(art: CharacterArt, view: View, kind: Accessory): { rows: string[]; top: number } | null {
  const piece = ACCESSORY_ART[kind]?.[view];
  return piece ? { rows: piece.rows, top: art.hairTop[view] + piece.dy } : null;
}

/** 안경: 눈 자리마다 테를 두르고, 앞모습이면 두 테를 다리로 잇는다 */
function drawGlasses(grid: Grid, eyes: Box[]): void {
  const set = (x: number, y: number) => { if (grid[TOP + y]?.[x] !== undefined) grid[TOP + y][x] = 'g'; };
  for (const e of eyes) {
    for (let x = e.x - 1; x <= e.x + e.w; x++) { set(x, e.y - 1); set(x, e.y + e.h); }
    for (let y = e.y; y < e.y + e.h; y++) { set(e.x - 1, y); set(e.x + e.w, y); }
  }
  if (eyes.length === 2) {
    const [a, b] = [...eyes].sort((p, q) => p.x - q.x);
    for (let x = a.x + a.w + 1; x < b.x - 1; x++) set(x, Math.min(a.y, b.y));
  }
}

/** 선글라스: 눈 자리를 검은 알로 덮고 테와 다리를 두른 뒤 왼쪽 위에 반사 한 점 */
function drawSunglasses(grid: Grid, eyes: Box[]): void {
  drawGlasses(grid, eyes);
  for (const e of eyes) {
    for (let y = e.y; y < e.y + e.h; y++) for (let x = e.x; x < e.x + e.w; x++) grid[TOP + y][x] = 'i';
    grid[TOP + e.y][e.x] = 'l';
  }
}

/** 손으로 찍은 캐릭터 한 장. 오른쪽은 왼쪽 모습을 뒤집어 그린다. */
export function composeCharacter(art: CharacterArt, look: DollLook, facing: Facing, pose: Pose, expression: Expression): HTMLCanvasElement {
  const view: View = facing === 'right' ? 'left' : facing;
  const grid: Grid = Array.from({ length: SPRITE_H }, () => Array<string>(SPRITE_W).fill('.'));
  const legRemap = art.legs === 'bare' ? (ch: string) => BARE_LEG[ch] ?? ch : undefined;
  const armRemap = art.sleeves === 'short' ? (ch: string, y: number) => (y >= SHORT_SLEEVE_FROM ? SHORT_SLEEVE[ch] ?? ch : ch) : undefined;
  const arms = ARMS[view][ARM_OF[pose]];
  const drawArms = () => arms.forEach((a) => stamp(grid, a.rows, a.y, armRemap));

  if (pose !== 'sit') stamp(grid, LEGS[view][STEP_OF[pose] ?? 'stand'], LEGS_TOP, legRemap);
  else if (view === 'left') stamp(grid, SEATED_LEGS_SIDE, LEGS_TOP, legRemap);
  stamp(grid, TORSO[art.outfit][view], TORSO_TOP);
  if (art.longHair) stamp(grid, art.longHair[view], 0);
  if (view === 'up') drawArms();
  stamp(grid, headWithExpression(art, view, expression), 0);
  if (art.crest) stamp(grid, art.crest[view], -TOP);
  const acc = accessoryLayer(art, view, look.accessory);
  if (acc) stamp(grid, acc.rows, acc.top);
  if (look.accessory === 'glasses' && view !== 'up') drawGlasses(grid, art.eyes[view]);
  if (look.accessory === 'sunglasses' && view !== 'up') drawSunglasses(grid, art.eyes[view]);
  if (view !== 'up') drawArms();
  if (expression === 'panic' && view !== 'up') stamp(grid, SWEAT, 2);

  const palette = paletteOf(art, look);
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const g = canvas.getContext('2d')!;
  const flip = facing === 'right';
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const color = palette[ch];
    if (ch === '.' || !color) return;
    g.fillStyle = color;
    g.fillRect(flip ? SPRITE_W - 1 - x : x, y, 1, 1);
  }));
  return canvas;
}

