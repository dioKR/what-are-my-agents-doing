import { test } from 'node:test';
import assert from 'node:assert/strict';
import { danceFacingAt, danceMoveAt } from './dance.ts';

test('캐릭터는 8초마다 디스코와 해파리 춤을 번갈아 추고, 해파리 춤은 앞만 본다', () => {
  const poses = (from: number) => new Set(Array.from({ length: 24 }, (_, i) => danceMoveAt(0, from + i / 3).pose));
  assert.deepEqual([...poses(0)].sort(), ['raise', 'stand', 'stretch']);
  assert.deepEqual([...poses(8)].sort(), ['jelly1', 'jelly2']);
  for (let i = 0; i < 24; i++) assert.equal(danceFacingAt(0, 8 + i / 3), 'down');
  // 옆 자리 캐릭터는 다른 춤을 추고 있다
  assert.ok(['jelly1', 'jelly2'].includes(danceMoveAt(1, 0).pose));
});
