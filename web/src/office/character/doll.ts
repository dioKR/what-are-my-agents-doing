// 캐릭터 한 장면(방향 × 자세 × 표정)을 그린다.
// - 손으로 찍은 그림이 있는 기본 캐릭터(look.character)는 그 그림(sprites/)을 쓴다.
// - 꾸미기로 머리 모양·옷을 바꾼 캐릭터는 아래의 부품 조립 방식으로 그린다 (24×36을 그려 32×44 도화지에 발을 맞춰 얹는다).
// - 사용자가 올린 캐릭터 시트(look.character = 'sheet:<id>')는 그 PNG에서 장면을 잘라 쓴다. 시트를 못 불러오면 부품 조립 그림으로 대신한다.
import { PixelSheet, shade } from './pixelSheet.ts';
import type { HeadItem } from '../../../../shared/shop.ts';
import { composeCharacter, SPRITE_FOOT_Y, SPRITE_H, SPRITE_W } from './sprites/compose.ts';
import { CHARACTER_ART } from './sprites/index.ts';
import { sheetFrame } from './sheets.ts';
import { SHEET_POSES, sheetIdOf, type SheetPose } from '../../../../shared/characterSheet.ts';

export const DOLL_W = SPRITE_W;
export const DOLL_H = SPRITE_H;
/** 그림에서 발바닥 줄 (지도에 세울 때 이 줄을 바닥에 맞춘다) */
export const DOLL_FOOT_Y = SPRITE_FOOT_Y;

// ---------- 부품 조립 방식 (24×36) ----------
const PAINT_W = 24;
const PAINT_H = 36;
const PAINT_FOOT_Y = 32;
const TOP = 4; // 머리 위 여백
const OUTLINE = '#221a26';

export type Facing = 'down' | 'up' | 'left' | 'right';
/** walk1·walk2는 한쪽 발을 든 장면. 두 발이 모이는 장면은 stand를 쓰고 몸을 1px 띄운다(그리는 쪽에서). */
export type Pose = 'stand' | 'walk1' | 'walk2' | 'sit' | 'type1' | 'type2' | 'think' | 'raise' | 'drink' | 'stretch' | 'carry'
  /** 해파리 춤: 두 팔을 옆으로 펴고 물결친다. jelly1 왼팔 위 · 오른팔 아래 → jelly2 수평 → jelly3 왼팔 아래 · 오른팔 위 (화면 기준) */
  | 'jelly1' | 'jelly2' | 'jelly3';
export type Expression = 'normal' | 'blink' | 'focus' | 'happy' | 'panic' | 'sleepy'
  /** 우는 얼굴 · 놀란 얼굴 · 뿌듯한 별 눈 · 지친 반쯤 감은 눈 */
  | 'cry' | 'surprised' | 'proud' | 'tired';
export type HairStyle = 'princess' | 'fluffy' | 'short' | 'spiky' | 'bob' | 'long' | 'ponytail' | 'buns' | 'shaggy' | 'dyedBob';
export type Outfit = 'blouseSkirt' | 'shirtTie' | 'tee' | 'hoodie' | 'staffTee';
export type EyeStyle = 'round' | 'heart';
/** 얼굴에 붙는 작은 장식 (머리 소품과 함께 쓸 수 있다) */
export type FaceMark = 'none' | 'bandage' | 'earrings';
/** 상점에서 사는 머리 장식(HeadItem)도 소품 자리에 쓴다. 부품 조립 그림은 이것들을 그리지 않는다 */
export type Accessory = 'none' | 'beret' | 'headphones' | 'cap' | 'glasses' | 'ribbon' | 'starclip' | 'sprout' | 'mailcap' | 'crown' | HeadItem;

export interface DollLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: string;
  eyeStyle: EyeStyle;
  outfit: Outfit;
  /** 윗옷 색 */
  shirt: string;
  /** 바지·치마 색 */
  pants: string;
  accessory: Accessory;
  /** 예전에 저장한 모습에는 없을 수 있다 */
  mark?: FaceMark;
  /** 손으로 찍은 기본 캐릭터 id, 또는 올린 캐릭터 시트('sheet:<id>'). 머리 모양·옷을 바꾸면 비운다 (그때는 부품 조립 방식으로 그린다) */
  character?: string;
}

interface Colors {
  skin: string; skinShade: string; hair: string; hairLight: string; hairShade: string;
  eyes: string; eyesDark: string;
  shirt: string; shirtLight: string; shirtShade: string; pants: string; pantsShade: string;
}

const LASH = '#2a1f35';
const BLUSH = '#f7a6ac';
const MOUTH = '#b8524a';
const TIE = '#1d1d22';
const LANYARD = '#2f6fe0';
const DYED_TIPS = '#c8283c'; // 투톤 단발의 붉은 끝머리
const BANDAGE = '#f3cfa4';
const SILVER = '#dfe4ec';
const TEAR = '#8fd3ff';

const cache = new Map<string, HTMLCanvasElement>();

/** 한 장면 그림. 같은 조합은 한 번만 그리고 재사용한다. */
export function dollFrame(look: DollLook, facing: Facing, pose: Pose, expression: Expression): HTMLCanvasElement {
  const key = `${JSON.stringify(look)}|${facing}|${pose}|${expression}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const sheetId = sheetIdOf(look.character);
  const art = look.character ? CHARACTER_ART[look.character] : undefined;
  const canvas = (sheetId ? sheetFrame(sheetId, facing, sheetPoseOf(pose)) : null)
    ?? (art ? composeCharacter(art, look, facing, pose, expression) : paintOnSpriteCanvas(look, facing, pose, expression));
  cache.set(key, canvas);
  return canvas;
}

/** 시트에 칸이 없는 자세(해파리 춤)는 손든 그림으로 대신한다 */
const sheetPoseOf = (pose: Pose): SheetPose => ((SHEET_POSES as readonly string[]).includes(pose) ? pose as SheetPose : 'raise');

/** 캐릭터 시트를 새로 불러오거나 지웠을 때, 그 전에 그려 둔 장면을 버린다 */
export function clearDollFrames(): void {
  cache.clear();
}

/** 부품 조립 그림을 손 그림과 같은 크기의 도화지에 발 높이를 맞춰 얹는다 */
function paintOnSpriteCanvas(look: DollLook, facing: Facing, pose: Pose, expression: Expression): HTMLCanvasElement {
  // 오른쪽을 보는 모습은 왼쪽 모습을 뒤집어 쓴다
  const painted = paint(look, facing === 'right' ? 'left' : facing, pose, expression).toCanvas(facing === 'right');
  const canvas = document.createElement('canvas');
  canvas.width = DOLL_W;
  canvas.height = DOLL_H;
  canvas.getContext('2d')!.drawImage(painted, (DOLL_W - PAINT_W) / 2, DOLL_FOOT_Y - PAINT_FOOT_Y);
  return canvas;
}

type View = 'down' | 'up' | 'left';

function paint(look: DollLook, view: View, pose: Pose, expression: Expression): PixelSheet {
  const s = new PixelSheet(PAINT_W, PAINT_H);
  const c: Colors = {
    skin: look.skin, skinShade: shade(look.skin, -0.1),
    hair: look.hair, hairLight: shade(look.hair, 0.3), hairShade: shade(look.hair, -0.22),
    eyes: look.eyes, eyesDark: shade(look.eyes, -0.45),
    shirt: look.shirt, shirtLight: shade(look.shirt, 0.3), shirtShade: shade(look.shirt, -0.16),
    pants: look.pants, pantsShade: shade(look.pants, -0.2)
  };
  // 앉으면 앞·뒷모습 다리는 책상·의자가 가려 그리지 않는다. 옆모습은 가릴 것이 없을 수 있어 앉은 다리를 그린다.
  if (pose !== 'sit' || view === 'left') legs(s, view, pose, c, look.outfit);
  hairBehind(s, view, look.hairStyle, c);
  torso(s, view, c, look.outfit);
  if (view === 'up') arms(s, view, pose, c, look.outfit);
  head(s, view, c);
  if (view !== 'up') face(s, view, expression, look.eyeStyle, c);
  hairFront(s, view, look.hairStyle, c);
  if (view !== 'up') faceMark(s, view, look.mark ?? 'none');
  accessory(s, view, look.accessory);
  if (view !== 'up') arms(s, view, pose, c, look.outfit);
  if (pose === 'drink') cup(s, view);
  s.outline(OUTLINE);
  return s;
}

const y = (v: number) => v + TOP;

// ---------- 다리 (짧고 통통하게) ----------
function legs(s: PixelSheet, view: View, pose: Pose, c: Colors, outfit: Outfit): void {
  const step = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0;
  const leg = outfit === 'blouseSkirt' ? c.skin : c.pants;
  const legBack = outfit === 'blouseSkirt' ? c.skinShade : c.pantsShade;
  const shoe = outfit === 'shirtTie' ? '#f4f4f6' : '#2a2228';
  if (view === 'left') {
    if (pose === 'sit') {
      // 허벅지는 앞(왼쪽)으로, 정강이와 신발은 그 끝에서 아래로
      s.rect(5, y(24), 9, 2, leg); s.rect(5, y(26), 3, 1, leg); s.rect(4, y(27), 4, 2, shoe);
    } else if (step === 0) {
      s.rect(10, y(25), 4, 2, leg); s.rect(9, y(27), 5, 2, shoe);
    } else {
      // 한 발은 앞으로 내딛고, 뒷발은 살짝 든다
      s.rect(12, y(25), 3, 1, legBack); s.rect(13, y(26), 3, 2, shoe);
      s.rect(8, y(25), 3, 2, leg); s.rect(6, y(27), 4, 2, shoe);
    }
  } else {
    const leftUp = step > 0 ? 1 : 0, rightUp = step < 0 ? 1 : 0;
    s.rect(8, y(25), 3, 2 - leftUp, leg); s.rect(8, y(27 - leftUp), 3, 2, shoe);
    s.rect(13, y(25), 3, 2 - rightUp, view === 'up' ? leg : legBack); s.rect(13, y(27 - rightUp), 3, 2, shoe);
    if (outfit === 'shirtTie' && view === 'down') { s.set(9, y(27 - leftUp), LANYARD); s.set(14, y(27 - rightUp), LANYARD); }
  }
  if (outfit === 'blouseSkirt') {
    if (view === 'left') { s.rect(8, y(23), 7, 1, c.pants); s.rect(7, y(24), 9, 1, c.pantsShade); }
    else { s.rect(7, y(23), 10, 1, c.pants); s.rect(6, y(24), 12, 1, c.pantsShade); }
  } else if (view === 'left') {
    s.rect(9, y(23), 6, 2, c.pants);
  } else {
    s.rect(8, y(23), 8, 2, c.pants);
  }
}

// ---------- 몸통 ----------
function torso(s: PixelSheet, view: View, c: Colors, outfit: Outfit): void {
  if (view === 'left') {
    s.rect(8, y(17), 7, 6, c.shirt);
    s.rect(14, y(17), 1, 6, c.shirtShade);
    if (outfit === 'shirtTie') { s.rect(8, y(18), 1, 5, TIE); s.rect(8, y(23), 7, 1, TIE); }
    if (outfit === 'hoodie') hood(s, view, c);
    return;
  }
  s.rect(7, y(17), 10, 6, c.shirt);
  s.rect(16, y(17), 1, 6, c.shirtShade);
  s.rect(7, y(22), 10, 1, c.shirtShade);
  if (outfit === 'hoodie') { hood(s, view, c); return; }
  if (view === 'up') return;
  if (outfit === 'staffTee') {
    s.rect(10, y(17), 4, 1, c.shirtLight);
    s.set(10, y(17), SILVER); s.set(11, y(18), SILVER); s.set(13, y(17), SILVER); s.set(12, y(18), SILVER); // 목걸이
    s.rect(13, y(19), 3, 2, '#ffffff'); s.rect(13, y(20), 3, 1, '#5b8de8'); // 명찰
    return;
  }
  if (outfit === 'tee') { s.rect(10, y(17), 4, 1, c.shirtLight); s.rect(9, y(19), 2, 2, c.shirtShade); return; }
  // 셔츠 깃 + 목
  s.set(9, y(17), c.shirtShade); s.set(10, y(18), c.shirtShade); s.set(14, y(17), c.shirtShade); s.set(13, y(18), c.shirtShade);
  s.rect(11, y(17), 2, 1, c.skin);
  if (outfit === 'blouseSkirt') {
    s.set(11, y(19), c.shirtShade); s.set(11, y(21), c.shirtShade);
    s.rect(13, y(19), 3, 2, '#ffffff'); s.set(14, y(18), '#9aa3ad'); s.set(14, y(20), '#e2454f'); // 사원증
  } else {
    s.rect(11, y(17), 2, 2, TIE); s.rect(11, y(19), 2, 3, TIE); s.set(11, y(22), TIE); // 넥타이
    s.rect(14, y(19), 2, 2, '#ffffff'); s.set(14, y(19), LANYARD); // 가슴 사원증
    s.rect(8, y(23), 8, 1, TIE); s.rect(11, y(23), 2, 1, '#c9ccd2'); // 벨트
    s.set(15, y(24), LANYARD); s.rect(15, y(25), 2, 2, '#a8d4ff'); // 목걸이 사원증
  }
}

/** 후드티: 목 뒤로 넘긴 모자, 끈 두 가닥, 앞주머니 */
function hood(s: PixelSheet, view: View, c: Colors): void {
  if (view === 'up') { s.rect(8, y(17), 8, 3, c.shirtShade); s.rect(9, y(20), 6, 1, c.shirtShade); return; }
  if (view === 'left') { s.rect(12, y(16), 4, 3, c.shirtShade); s.rect(7, y(21), 5, 2, c.shirtShade); return; }
  s.rect(7, y(17), 10, 1, c.shirtShade);
  s.set(10, y(18), '#f4f4f6'); s.set(10, y(19), '#f4f4f6'); s.set(13, y(18), '#f4f4f6'); s.set(13, y(19), '#f4f4f6');
  s.rect(9, y(21), 6, 1, c.shirtShade);
}

// ---------- 팔 ----------
function arms(s: PixelSheet, view: View, pose: Pose, c: Colors, outfit: Outfit): void {
  const sleeve = view === 'left' ? shade(c.shirt, -0.06) : c.shirt;
  const shortSleeve = outfit === 'shirtTie';
  /** 세로 팔: 어깨 쪽 소매(반팔이면 2칸만), 나머지는 팔뚝, 끝에 손 */
  const arm = (x: number, top: number, h: number, handY: number, handX = x) => {
    const shoulderAtTop = handY > top;
    for (let i = 0; i < h; i++) {
      const fromShoulder = shoulderAtTop ? i : h - 1 - i;
      s.rect(x, y(top + i), 2, 1, shortSleeve && fromShoulder >= 2 ? c.skin : sleeve);
    }
    s.rect(handX, y(handY), 2, 1, c.skin);
  };
  const fore = shortSleeve ? c.skin : sleeve; // 앞으로 뻗은 팔뚝 색

  if (view === 'left') {
    switch (pose) {
      case 'walk1': arm(9, 18, 5, 23, 8); return;
      case 'walk2': arm(12, 18, 5, 23, 13); return;
      case 'type1': case 'type2': case 'sit': {
        const hy = pose === 'type2' ? 21 : 20;
        s.rect(9, y(18), 3, 2, sleeve); s.rect(6, y(hy), 3, 2, fore); s.rect(5, y(hy), 1, 2, c.skin);
        return;
      }
      case 'think': s.rect(9, y(18), 2, 2, sleeve); s.rect(7, y(16), 2, 3, fore); s.rect(6, y(15), 2, 1, c.skin); return;
      case 'drink': s.rect(9, y(18), 2, 2, sleeve); s.rect(7, y(16), 2, 3, fore); s.rect(6, y(16), 1, 2, c.skin); return;
      case 'raise': case 'stretch': case 'carry': case 'jelly1': case 'jelly2': case 'jelly3': arm(10, 4, 13, 2); return;
      default: arm(11, 18, 5, 23);
    }
    return;
  }
  const left = (top: number, h: number, hand: number) => arm(5, top, h, hand);
  const right = (top: number, h: number, hand: number) => arm(17, top, h, hand);
  switch (pose) {
    case 'walk1': left(19, 4, 23); right(17, 4, 21); return;
    case 'walk2': left(17, 4, 21); right(19, 4, 23); return;
    case 'type1': case 'type2': case 'sit': {
      if (view === 'up') { left(18, 3, 21); right(18, 3, 21); return; }
      const l = pose === 'type2' ? 22 : 21, r = pose === 'type1' ? 22 : 21;
      s.rect(5, y(18), 2, 2, sleeve); s.rect(6, y(20), 3, 1, fore); s.rect(8, y(l), 2, 1, c.skin);
      s.rect(17, y(18), 2, 2, sleeve); s.rect(15, y(20), 3, 1, fore); s.rect(14, y(r), 2, 1, c.skin);
      return;
    }
    case 'think': left(18, 4, 22); s.rect(17, y(18), 2, 2, sleeve); s.rect(15, y(15), 2, 4, fore); s.rect(13, y(15), 2, 1, c.skin); return;
    case 'drink': left(18, 4, 22); s.rect(17, y(18), 2, 2, sleeve); s.rect(15, y(15), 2, 4, fore); s.rect(14, y(16), 1, 2, c.skin); return;
    case 'raise': left(18, 4, 22); arm(19, 3, 14, 1); return;
    case 'stretch': arm(2, 3, 14, 1); arm(20, 3, 14, 1); return;
    case 'carry': arm(3, 2, 15, 0); arm(19, 2, 15, 0); return;
    case 'jelly1': case 'jelly2': case 'jelly3': {
      // 두 팔을 옆으로 쭉 펴고, 한쪽 손끝이 올라가면 다른 쪽은 내려간다
      const UP = 16, LEVEL = 18, DOWN = 20;
      const [leftHand, rightHand] = pose === 'jelly1' ? [UP, DOWN] : pose === 'jelly3' ? [DOWN, UP] : [LEVEL, LEVEL];
      s.rect(1, y(18), 4, 2, fore); s.rect(19, y(18), 4, 2, fore);
      s.rect(0, y(leftHand), 1, 2, c.skin); s.rect(23, y(rightHand), 1, 2, c.skin);
      return;
    }
    default: left(18, 4, 22); right(18, 4, 22);
  }
}

// ---------- 머리 (크고 둥글게) ----------
function head(s: PixelSheet, view: View, c: Colors): void {
  s.ellipse(view === 'left' ? 11 : 11.5, y(9.5), 8, 7.5, c.skin);
  s.recolor((_x, yy, col) => col === c.skin && yy >= y(16), c.skinShade);
}

function hairBehind(s: PixelSheet, view: View, style: HairStyle, c: Colors): void {
  // 어깨 뒤로 늘어지는 머리 (몸통보다 먼저 그린다)
  const longness: Partial<Record<HairStyle, number>> = { princess: 27, long: 25, bob: 16, dyedBob: 18 };
  const bottom = longness[style];
  if (view === 'down' && bottom) { s.rect(2, y(11), 2, bottom - 11, c.hairShade); s.rect(20, y(11), 2, bottom - 11, c.hairShade); }
  if (view === 'left' && bottom) s.rect(13, y(9), 7, bottom - 9, c.hairShade);
  if (style === 'dyedBob' && bottom) {
    if (view === 'down') { s.rect(2, y(bottom - 2), 2, 2, DYED_TIPS); s.rect(20, y(bottom - 2), 2, 2, DYED_TIPS); }
    if (view === 'left') s.rect(13, y(bottom - 2), 7, 2, DYED_TIPS);
  }
  if (view === 'left' && style === 'ponytail') s.rect(18, y(8), 4, 13, c.hairShade);
}

function hairFront(s: PixelSheet, view: View, style: HairStyle, c: Colors): void {
  if (style === 'buns') {
    if (view === 'left') s.ellipse(14, y(1.5), 2.5, 2.5, c.hair);
    else { s.ellipse(4.5, y(1.5), 2.5, 2.5, c.hair); s.ellipse(18.5, y(1.5), 2.5, 2.5, c.hair); }
  }
  if (view === 'up') hairBackView(s, style, c);
  else if (view === 'left') hairSideView(s, style, c);
  else hairFrontView(s, style, c);
  if (style === 'spiky') for (let x = 5; x <= 17; x += 3) { s.set(x + 1, y(-1), c.hair); s.rect(x, y(0), 3, 1, c.hair); }
  if (style === 'princess' || style === 'fluffy' || style === 'shaggy') ahoge(s, view, c);
  // 왼쪽 위에서 빛이 닿는 머릿결
  s.recolor((x, yy, col) => col === c.hair && yy === y(3) && x >= 6 && x <= 11, c.hairLight);
  s.recolor((x, yy, col) => col === c.hair && yy === y(4) && x >= 7 && x <= 9, c.hairLight);
}

function hairFrontView(s: PixelSheet, style: HairStyle, c: Colors): void {
  s.ellipse(11.5, y(8), 8.6, 6.6, c.hair, (_x, yy) => yy <= y(8));
  switch (style) {
    case 'princess':
      s.rect(4, y(9), 16, 1, c.hair);
      s.rect(3, y(9), 2, 12, c.hair); s.rect(19, y(9), 2, 12, c.hair);
      s.rect(3, y(21), 1, 4, c.hair); s.rect(20, y(21), 1, 4, c.hair);
      for (let i = 0; i < 4; i++) { s.set(4, y(9 + i), i % 2 ? c.hairShade : c.hairLight); s.set(19, y(9 + i), i % 2 ? c.hairLight : c.hairShade); }
      return;
    case 'fluffy':
      s.rect(4, y(9), 16, 1, c.hair);
      for (let x = 5; x <= 18; x++) if (x % 3 === 1) s.set(x, y(10), c.hair);
      s.set(7, y(11), c.hair); s.set(16, y(11), c.hair);
      s.rect(2, y(8), 2, 6, c.hair); s.rect(20, y(8), 2, 6, c.hair);
      s.set(2, y(14), c.hair); s.set(21, y(14), c.hair); s.set(1, y(10), c.hair); s.set(22, y(11), c.hair);
      return;
    case 'shaggy': {
      // 눈을 덮는 덥수룩한 앞머리: 왼눈은 가리고 오른눈은 틈으로 보인다. 아래 끝은 들쭉날쭉
      s.rect(3, y(9), 18, 1, c.hair);
      s.rect(4, y(10), 8, 2, c.hair); s.rect(12, y(10), 3, 1, c.hair);
      for (const x of [4, 6, 9, 11]) s.set(x, y(12), c.hair);
      s.set(13, y(11), c.hair); s.set(18, y(10), c.hair); s.set(19, y(10), c.hair);
      for (let i = 0; i < 3; i++) s.set(6 + i * 2, y(10 + (i % 2)), c.hairShade);
      s.rect(2, y(8), 2, 7, c.hair); s.rect(20, y(8), 2, 6, c.hair); s.set(1, y(12), c.hair); s.set(22, y(9), c.hair);
      return;
    }
    case 'dyedBob':
      // 일자 앞머리 + 볼까지 오는 옆머리, 끝은 붉게 물들였다
      s.rect(4, y(9), 16, 1, c.hair);
      for (let x = 5; x <= 18; x += 2) s.set(x, y(10), c.hair);
      s.rect(3, y(9), 2, 7, c.hair); s.rect(19, y(9), 2, 7, c.hair);
      s.rect(3, y(15), 2, 2, DYED_TIPS); s.rect(19, y(15), 2, 2, DYED_TIPS);
      s.set(4, y(10), c.hairShade); s.set(19, y(10), c.hairShade);
      return;
    default:
      for (let x = 4; x <= 19; x++) if (x % 3 !== 0) s.set(x, y(9), c.hair);
      s.rect(3, y(9), 2, 4, c.hair); s.rect(19, y(9), 2, 4, c.hair);
  }
}

function hairBackView(s: PixelSheet, style: HairStyle, c: Colors): void {
  s.ellipse(11.5, y(9), 8.6, 7.8, c.hair);
  if (style === 'princess') s.rect(3, y(14), 18, 13, c.hair);
  if (style === 'long') s.rect(4, y(14), 16, 11, c.hair);
  if (style === 'bob') s.rect(3, y(14), 18, 3, c.hair);
  if (style === 'dyedBob') { s.rect(3, y(14), 18, 4, c.hair); s.rect(3, y(17), 18, 2, DYED_TIPS); }
  if (style === 'shaggy') for (let x = 4; x <= 19; x += 3) s.set(x, y(17), c.hair);
  if (style === 'ponytail') s.rect(10, y(15), 4, 10, c.hairShade);
  if (style === 'fluffy') for (let x = 4; x <= 19; x += 2) s.set(x, y(17), c.hair);
  if (style === 'princess') for (let i = 0; i < 6; i++) { s.set(6, y(11 + i), i % 2 ? c.hairShade : c.hairLight); s.set(17, y(11 + i), i % 2 ? c.hairLight : c.hairShade); }
}

function hairSideView(s: PixelSheet, style: HairStyle, c: Colors): void {
  s.ellipse(11, y(8), 8.6, 6.6, c.hair, (_x, yy) => yy <= y(8));
  s.ellipse(11, y(9), 8.6, 7.8, c.hair, (x) => x >= 12);
  for (let x = 3; x <= 11; x++) if (x % 3 !== 1) s.set(x, y(9), c.hair);
  if (style === 'princess') { s.rect(3, y(9), 9, 1, c.hair); s.rect(13, y(10), 7, 17, c.hair); for (let i = 0; i < 4; i++) s.set(12, y(9 + i), i % 2 ? c.hairShade : c.hairLight); }
  if (style === 'shaggy') { s.rect(2, y(9), 6, 3, c.hair); s.set(3, y(12), c.hair); s.set(6, y(12), c.hair); for (let yy = 10; yy <= 15; yy += 2) s.set(20, y(yy), c.hair); }
  if (style === 'dyedBob') { s.rect(3, y(9), 6, 1, c.hair); s.rect(13, y(14), 7, 2, c.hair); s.rect(13, y(16), 7, 2, DYED_TIPS); }
  if (style === 'fluffy') { s.set(4, y(10), c.hair); s.set(7, y(10), c.hair); for (let yy = 10; yy <= 16; yy += 2) s.set(20, y(yy), c.hair); }
}

/** 머리 위로 휘어 솟은 한 가닥 */
function ahoge(s: PixelSheet, view: View, c: Colors): void {
  const x0 = view === 'left' ? 11 : 12;
  s.set(x0, y(1), c.hair); s.set(x0, y(0), c.hair); s.set(x0 + 1, y(-1), c.hair); s.set(x0 + 2, y(-2), c.hair); s.set(x0 + 3, y(-2), c.hair); s.set(x0 + 4, y(-1), c.hair);
}

// ---------- 얼굴 ----------
function face(s: PixelSheet, view: View, expression: Expression, eyeStyle: EyeStyle, c: Colors): void {
  const side = view === 'left';
  for (const ex of side ? [4] : [6, 15]) eye(s, ex, expression, eyeStyle, c, side);
  if (expression !== 'panic' && expression !== 'cry') {
    if (side) s.rect(3, y(14), 2, 1, BLUSH);
    else { s.rect(4, y(14), 2, 1, BLUSH); s.rect(18, y(14), 2, 1, BLUSH); }
  }
  const mx = side ? 4 : 11;
  switch (expression) {
    case 'panic':
      s.rect(mx, y(15), 2, 2, LASH);
      s.set(side ? 16 : 21, y(5), '#8fd3ff'); s.rect(side ? 15 : 20, y(6), 2, 2, '#8fd3ff');
      break;
    case 'happy': case 'proud': s.set(mx - 1, y(15), MOUTH); s.rect(mx, y(16), 2, 1, MOUTH); s.set(mx + 2, y(15), MOUTH); break;
    case 'cry': s.rect(mx, y(15), 2, 1, MOUTH); s.set(mx - 1, y(16), MOUTH); s.set(mx + 2, y(16), MOUTH); break; // 입꼬리가 내려감
    case 'surprised': s.rect(mx, y(15), 2, 2, MOUTH); break; // 동그란 입
    case 'tired': s.rect(mx, y(15), 2, 1, shade(MOUTH, -0.25)); break; // 일자 입
    case 'focus': s.set(mx + 1, y(15), MOUTH); break;
    default: s.set(mx, y(15), MOUTH); s.set(mx + 1, y(15), MOUTH);
  }
}

/** 애니메이션풍 눈 (3×4): 속눈썹 · 홍채 · 동공 · 반짝임 두 개 */
function eye(s: PixelSheet, x: number, expression: Expression, style: EyeStyle, c: Colors, side: boolean): void {
  const lashOut = side ? x - 1 : x === 6 ? x - 1 : x + 3; // 바깥쪽 눈꼬리
  switch (expression) {
    case 'blink': case 'sleepy':
      s.rect(x, y(12), 3, 1, LASH); s.set(lashOut, y(11), LASH);
      return;
    case 'happy':
      s.set(x, y(12), LASH); s.set(x + 1, y(11), LASH); s.set(x + 2, y(12), LASH);
      return;
    case 'panic':
      s.rect(x, y(11), 3, 3, '#ffffff'); s.set(x + 1, y(12), LASH); s.rect(x, y(10), 3, 1, LASH);
      return;
    case 'cry':
      // 꼭 감은 눈(아래로 휜 줄) 아래로 눈물 두 방울
      s.rect(x, y(12), 3, 1, LASH); s.set(lashOut, y(13), LASH);
      s.set(x + 1, y(13), TEAR); s.set(x + 1, y(14), TEAR);
      return;
    case 'surprised':
      // 평소 눈보다 한 줄 위로 크게 뜬 눈
      s.rect(x, y(9), 3, 1, LASH); s.set(lashOut, y(9), LASH);
      s.rect(x, y(10), 3, 3, c.eyes); s.set(x + 1, y(11), c.eyesDark); s.set(x, y(10), '#ffffff'); s.rect(x, y(13), 3, 1, c.eyesDark);
      return;
    case 'proud':
      // 반짝이는 별 눈: 가운데 흰 점, 상하좌우로 눈동자 색
      s.set(x + 1, y(10), c.eyes); s.rect(x, y(11), 3, 1, c.eyes); s.set(x + 1, y(12), c.eyes); s.set(x + 1, y(11), '#ffffff');
      return;
    case 'tired':
      // 눈꺼풀이 반쯤 내려온 눈
      s.rect(x, y(11), 3, 1, LASH); s.set(lashOut, y(11), LASH);
      s.rect(x, y(12), 3, 1, c.eyes); s.set(x + 1, y(12), c.eyesDark); s.rect(x, y(13), 3, 1, c.eyesDark);
      return;
    case 'focus':
      s.rect(x, y(11), 3, 1, LASH); s.set(lashOut, y(11), LASH);
      s.rect(x, y(12), 3, 1, c.eyes); s.set(x + 1, y(12), c.eyesDark); s.rect(x, y(13), 3, 1, c.eyesDark);
      return;
    default:
      s.rect(x, y(10), 3, 1, LASH); s.set(lashOut, y(10), LASH);
      s.rect(x, y(11), 3, 2, c.eyes); s.rect(x, y(13), 3, 1, c.eyesDark);
      if (style === 'heart') { s.set(x + 1, y(12), '#ffffff'); s.set(x, y(11), '#ffd6e2'); }
      else { s.set(x + 1, y(12), c.eyesDark); s.set(x, y(11), '#ffffff'); s.set(x + 2, y(13), '#fff3d6'); }
  }
}

// ---------- 얼굴 장식 ----------
function faceMark(s: PixelSheet, view: View, mark: FaceMark): void {
  const side = view === 'left';
  switch (mark) {
    case 'bandage': {
      // 볼에 붙인 반창고 (가운데 거즈는 조금 진하게)
      const x = side ? 6 : 16;
      s.rect(x, y(14), 4, 2, BANDAGE); s.rect(x + 1, y(14), 2, 2, '#e2b07e');
      return;
    }
    case 'earrings':
      if (side) { s.set(12, y(15), SILVER); s.set(12, y(16), SILVER); }
      else { s.set(3, y(17), SILVER); s.set(20, y(17), SILVER); }
      return;
    case 'none':
      return;
  }
}

// ---------- 소품 ----------
function accessory(s: PixelSheet, view: View, kind: Accessory): void {
  const side = view === 'left';
  switch (kind) {
    case 'beret':
      s.ellipse(side ? 12 : 10, y(2), 7, 2.2, '#b8442a');
      s.set(side ? 12 : 10, y(-1), '#7a2a18');
      return;
    case 'headphones':
      s.rect(5, y(1), 14, 1, '#3a3f48'); s.rect(4, y(2), 1, 2, '#3a3f48'); s.rect(19, y(2), 1, 2, '#3a3f48');
      if (side) { s.rect(14, y(8), 4, 6, '#2a2e36'); s.rect(15, y(10), 2, 2, '#4a5260'); }
      else { s.rect(1, y(8), 3, 6, '#2a2e36'); s.rect(20, y(8), 3, 6, '#2a2e36'); s.set(2, y(10), '#7fe0b4'); s.set(21, y(10), '#7fe0b4'); }
      return;
    case 'cap':
    case 'mailcap': {
      const color = kind === 'cap' ? '#2f5fa8' : '#2c4f8a';
      s.ellipse(side ? 11 : 11.5, y(4), 8.8, 3.7, color, (_x, yy) => yy <= y(6));
      if (view === 'down') s.rect(5, y(6), 14, 1, shade(color, -0.25));
      if (side) s.rect(1, y(6), 7, 1, shade(color, -0.25));
      if (kind === 'mailcap' && view !== 'up') s.rect(side ? 8 : 11, y(3), 2, 2, '#ffd34d');
      return;
    }
    case 'crown':
      s.rect(7, y(0), 10, 2, '#ffd34d'); s.set(7, y(-1), '#ffd34d'); s.set(11, y(-2), '#ffd34d'); s.set(12, y(-2), '#ffd34d'); s.set(16, y(-1), '#ffd34d');
      s.set(11, y(0), '#e2454f'); s.set(14, y(0), '#5b8de8'); s.set(9, y(0), '#7cc68a');
      return;
    case 'glasses':
      if (view === 'up') return;
      if (side) { s.rect(2, y(10), 6, 1, '#2a2232'); s.rect(7, y(10), 6, 1, '#2a2232'); return; }
      s.rect(5, y(10), 5, 1, '#2a2232'); s.rect(14, y(10), 5, 1, '#2a2232'); s.rect(10, y(10), 4, 1, '#2a2232');
      s.set(5, y(11), '#2a2232'); s.set(18, y(11), '#2a2232');
      return;
    case 'ribbon': {
      const x = side ? 14 : view === 'up' ? 4 : 16;
      s.rect(x, y(1), 2, 2, '#e2454f'); s.rect(x + 3, y(1), 2, 2, '#e2454f'); s.set(x + 2, y(2), '#b8303a');
      return;
    }
    case 'starclip':
      if (view === 'up') return;
      { const x = side ? 9 : 17; s.set(x, y(5), '#ffd34d'); s.rect(x - 1, y(6), 3, 1, '#ffd34d'); s.set(x, y(6), '#fff3b0'); s.set(x, y(7), '#ffd34d'); }
      return;
    case 'sprout':
      s.set(11, y(-1), '#6fd06a'); s.set(10, y(-2), '#6fd06a'); s.set(12, y(-2), '#4fb04a'); s.set(11, y(0), '#3f8a3c');
      return;
    case 'none':
      return;
  }
}

function cup(s: PixelSheet, view: View): void {
  const x = view === 'left' ? 3 : 12;
  s.rect(x, y(13), 3, 3, '#f4f0e6');
  s.rect(x, y(13), 3, 1, '#6b4226');
}
