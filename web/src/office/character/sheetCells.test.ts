import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingCells, resolveCell } from './sheetCells.ts';

test('빈 칸은 같은 방향 stand로, 오른쪽 줄이 비었으면 왼쪽을 뒤집어 쓴다', () => {
  const drawn = new Set(['down:stand', 'down:sit', 'left:stand', 'left:walk1']);
  const isEmpty = (facing: string, pose: string) => !drawn.has(`${facing}:${pose}`);
  assert.deepEqual(resolveCell(isEmpty, 'down', 'sit'), { facing: 'down', pose: 'sit', mirrored: false });
  assert.deepEqual(resolveCell(isEmpty, 'down', 'type1'), { facing: 'down', pose: 'stand', mirrored: false });
  assert.deepEqual(resolveCell(isEmpty, 'right', 'walk1'), { facing: 'left', pose: 'walk1', mirrored: true });
  assert.deepEqual(resolveCell(isEmpty, 'right', 'sit'), { facing: 'left', pose: 'stand', mirrored: true });
  assert.equal(resolveCell(isEmpty, 'up', 'stand'), null);
});

test('앞 · 뒤 · 왼쪽의 서기와 걷기 두 장은 꼭 그려야 한다', () => {
  assert.equal(missingCells(() => true).length, 9);
  assert.deepEqual(missingCells((facing, pose) => facing === 'up' && pose === 'walk2'), [['up', 'walk2']]);
  assert.deepEqual(missingCells((facing) => facing === 'right'), []);
});
