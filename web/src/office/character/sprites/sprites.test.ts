// 손으로 찍은 도트 데이터가 깨지지 않았는지 검사한다: 줄 길이, 줄 수, 색이 정해지지 않은 글자.
// PR에서 그림을 고치다 한 칸 밀리거나 새 글자를 팔레트에 안 넣으면 여기서 걸린다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS } from '../../look.ts';
import { SHOP_ITEMS, type HeadItem } from '../../../../../shared/shop.ts';
import { PET_ART, PET_H, PET_W } from '../../pets/petArt.ts';
import { ACCESSORY_ART, ACCESSORY_COLORS, SWEAT } from './accessories.ts';
import { paletteOf, SPRITE_W } from './compose.ts';
import { CHARACTER_ART } from './index.ts';
import { ARMS, LEGS, TORSO } from './parts.ts';
import type { View } from './types.ts';

const VIEWS: View[] = ['down', 'up', 'left'];
const HEAD_ROWS = 23;
const lettersOf = (rows: string[]) => new Set(rows.join('').replace(/\./g, ''));
const assertWidth = (rows: string[], max: number, where: string) =>
  rows.forEach((row, i) => assert.ok(row.length <= max, `${where} ${i}번째 줄이 ${row.length}칸 (최대 ${max})`));

test('기본 캐릭터마다 손 그림이 있고, 머리는 방향마다 23줄 × 32칸', () => {
  for (const preset of PRESETS) {
    const art = CHARACTER_ART[preset.look.character ?? ''];
    assert.ok(art, `${preset.id}: 손 그림이 없음`);
    for (const view of VIEWS) {
      assert.equal(art.head[view].length, HEAD_ROWS, `${preset.id} ${view} 머리 줄 수`);
      art.head[view].forEach((row, i) => assert.equal(row.length, SPRITE_W, `${preset.id} ${view} 머리 ${i}번째 줄`));
      if (art.longHair) assertWidth(art.longHair[view], SPRITE_W, `${preset.id} ${view} 긴 머리`);
      if (art.crest) assertWidth(art.crest[view], SPRITE_W, `${preset.id} ${view} 머리 위`);
    }
    for (const eye of [...art.eyes.down, ...art.eyes.left]) {
      assert.ok(eye.x >= 0 && eye.x + eye.w <= SPRITE_W && eye.y >= 0 && eye.y + eye.h <= HEAD_ROWS, `${preset.id}: 눈 자리가 머리 밖`);
    }
  }
});

test('몸통·팔·다리·소품 그림이 32칸을 넘지 않는다', () => {
  for (const [outfit, views] of Object.entries(TORSO)) for (const view of VIEWS) assertWidth(views[view], SPRITE_W, `${outfit} ${view} 몸통`);
  for (const view of VIEWS) {
    for (const [step, rows] of Object.entries(LEGS[view])) assertWidth(rows, SPRITE_W, `${view} ${step} 다리`);
    for (const [pose, stamps] of Object.entries(ARMS[view])) stamps.forEach((s) => assertWidth(s.rows, SPRITE_W, `${view} ${pose} 팔`));
  }
  for (const [kind, pieces] of Object.entries(ACCESSORY_ART)) for (const piece of Object.values(pieces ?? {})) assertWidth(piece.rows, SPRITE_W, `${kind} 소품`);
});

test('그림에 쓴 글자는 모두 색이 정해져 있다', () => {
  for (const preset of PRESETS) {
    const art = CHARACTER_ART[preset.look.character ?? '']!;
    const palette = paletteOf(art, preset.look);
    const used = new Set<string>();
    for (const view of VIEWS) {
      [art.head[view], art.longHair?.[view] ?? [], art.crest?.[view] ?? [], TORSO[art.outfit][view], ...Object.values(LEGS[view]), ...Object.values(ARMS[view]).flat().map((s) => s.rows)]
        .forEach((rows) => lettersOf(rows).forEach((ch) => used.add(ch)));
    }
    for (const ch of used) assert.ok(palette[ch], `${preset.id}: '${ch}' 글자의 색이 없음`);
  }
  const accessoryLetters = new Set([...Object.values(ACCESSORY_ART).flatMap((p) => Object.values(p ?? {}).flatMap((piece) => piece.rows)), ...SWEAT].join('').replace(/\./g, ''));
  // 소품은 캐릭터 팔레트(머리색을 따르는 고양이 귀의 H·h·o, 흰색 w 등)와 소품 전용 색으로 칠한다
  const base = PRESETS[0].look;
  const characterPalette = paletteOf(CHARACTER_ART[base.character ?? '']!, base);
  for (const ch of accessoryLetters) assert.ok(ACCESSORY_COLORS[ch] || characterPalette[ch], `소품: '${ch}' 글자의 색이 없음`);
});

test('상점 물건마다 그림이 있고, 펫 그림은 16×14', () => {
  for (const item of SHOP_ITEMS) {
    if (item.slot === 'pet') {
      const art = PET_ART[item.id as keyof typeof PET_ART];
      assert.ok(art, `${item.id}: 펫 그림이 없음`);
      for (const frame of ['idle', 'walk1', 'walk2'] as const) {
        assert.equal(art[frame].length, PET_H, `${item.id} ${frame} 줄 수`);
        art[frame].forEach((row) => assert.equal(row.length, PET_W, `${item.id} ${frame} 줄 길이`));
        lettersOf(art[frame]).forEach((ch) => assert.ok(art.palette[ch], `${item.id}: '${ch}' 글자의 색이 없음`));
      }
    } else if (item.id !== 'sunglasses') {
      // 선글라스는 눈 자리를 따라 compose.ts가 그린다
      assert.ok(ACCESSORY_ART[item.id as HeadItem]?.down, `${item.id}: 머리 장식 그림이 없음`);
    }
    assert.ok(item.price > 0 && item.label.ko && item.label.en, `${item.id}: 값이나 이름이 없음`);
  }
  assert.equal(new Set(SHOP_ITEMS.map((i) => i.id)).size, SHOP_ITEMS.length, '상점 물건 id가 겹침');
});
