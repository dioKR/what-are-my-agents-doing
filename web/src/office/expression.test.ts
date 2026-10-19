import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AgentSnapshot } from '../../../shared/protocol.ts';
import { expressionOf, type FaceState } from './expression.ts';

const face: FaceState = { isDancing: false, isSeated: true, cheerLeft: 0, proudLeft: 0 };
const agent = (o: Partial<AgentSnapshot>) => ({ activity: 'working', failStreak: 0, contextUsedRatio: 0.2, ...o }) as AgentSnapshot;
const NOW = 100_000;

test('상황마다 표정: 막힘 > 울기 > 놀람 > 뿌듯 > 기쁨 > 지침 > 집중', () => {
  assert.equal(expressionOf(face, agent({}), NOW), 'focus');
  assert.equal(expressionOf(face, agent({ contextUsedRatio: 0.75 }), NOW), 'tired');
  assert.equal(expressionOf({ ...face, cheerLeft: 1 }, agent({ contextUsedRatio: 0.75 }), NOW), 'happy');
  assert.equal(expressionOf({ ...face, proudLeft: 1, cheerLeft: 1 }, agent({}), NOW), 'proud');
  assert.equal(expressionOf({ ...face, proudLeft: 1 }, agent({ activity: 'waiting-permission' }), NOW), 'surprised');
  assert.equal(expressionOf(face, agent({ activity: 'waiting-permission', failStreak: 2 }), NOW), 'cry');
  assert.equal(expressionOf(face, agent({ activity: 'stuck', failStreak: 5 }), NOW), 'panic');
  assert.equal(expressionOf({ ...face, isDancing: true }, agent({ activity: 'stuck' }), NOW), 'happy');
});

test('앱에서 거부당하면 6초 동안 운다', () => {
  assert.equal(expressionOf(face, agent({ activity: 'thinking', deniedAt: NOW - 1_000 }), NOW), 'cry');
  assert.equal(expressionOf(face, agent({ activity: 'thinking', deniedAt: NOW - 7_000 }), NOW), 'normal');
});
