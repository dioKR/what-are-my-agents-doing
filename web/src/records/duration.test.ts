import { test } from 'node:test';
import assert from 'node:assert/strict';
import { durationParts } from './duration.ts';

test('걸린 시간은 큰 단위부터 두 개까지, 0인 단위는 뺀다', () => {
  assert.deepEqual(durationParts(48_000), [['s', 48]]);
  assert.deepEqual(durationParts(3_725_000), [['h', 1], ['m', 2]]);
  assert.deepEqual(durationParts(3_600_400), [['h', 1]]);
  assert.deepEqual(durationParts(2 * 86_400_000 + 3 * 3_600_000 + 59_000), [['d', 2], ['h', 3]]);
  assert.deepEqual(durationParts(300), [['s', 0]]);
});
