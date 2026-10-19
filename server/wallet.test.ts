import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyClaudeHook, type ClaudeHookPayload } from './claudeHook.ts';
import { buy, earn, equip, rewardsFor } from './wallet.ts';
import { EMPTY_WALLET } from '../shared/shop.ts';

const e = (o: Partial<ClaudeHookPayload>): ClaudeHookPayload => ({ session_id: 's', hook_event_name: 'PreToolUse', ...o });

test('일하다가 턴을 마치면 1코인, 처음 알려 준 PR은 10코인, 새로 끝낸 할 일은 3코인', () => {
  const working = applyClaudeHook(undefined, e({ tool_name: 'Edit', tool_input: { file_path: '/r/a.ts' } }), 1);
  const stopped = applyClaudeHook(working, e({ hook_event_name: 'Stop' }), 2);
  assert.deepEqual(rewardsFor(working, stopped, e({ hook_event_name: 'Stop' })), ['turn']);
  // 이미 기다리던 중에 온 Stop은 코인이 없다
  assert.deepEqual(rewardsFor(stopped, applyClaudeHook(stopped, e({ hook_event_name: 'Stop' }), 3), e({ hook_event_name: 'Stop' })), []);

  const prEvent = e({ hook_event_name: 'AssistantText', assistant_text: 'PR: https://github.com/acme/shop/pull/7' });
  const withPr = applyClaudeHook(stopped, prEvent, 4);
  assert.deepEqual(rewardsFor(stopped, withPr, prEvent), ['pr']);
  assert.deepEqual(rewardsFor(withPr, applyClaudeHook(withPr, prEvent, 5), prEvent), []);

  const todos = (status: string) => e({ tool_name: 'TodoWrite', tool_input: { todos: [{ content: 'a', status: 'completed' }, { content: 'b', status }] } });
  const one = applyClaudeHook(withPr, todos('pending'), 6);
  const two = applyClaudeHook(one, todos('completed'), 7);
  assert.deepEqual(rewardsFor(withPr, one, todos('pending')), ['todo']);
  assert.deepEqual(rewardsFor(one, two, todos('completed')), ['todo']);
});

test('코인이 모자라면 못 사고, 산 물건만 같은 칸에 입힐 수 있다', () => {
  const rich = earn(EMPTY_WALLET, 's', '쇼핑몰', ['pr', 'pr', 'pr'], 1).state;
  assert.equal(rich.coins, 30);
  assert.deepEqual(buy(rich, 'santaHat'), { ok: false, error: 'not-enough-coins' });
  const bought = buy(rich, 'catEars');
  assert.ok(bought.ok);
  if (!bought.ok) return;
  assert.equal(bought.state.coins, 0);
  assert.deepEqual(buy(bought.state, 'catEars'), { ok: false, error: 'already-owned' });
  assert.deepEqual(equip(bought.state, 'k', 'pet', 'catEars'), { ok: false, error: 'wrong-slot' });
  assert.deepEqual(equip(bought.state, 'k', 'head', 'santaHat'), { ok: false, error: 'not-owned' });
  const worn = equip(bought.state, 'k', 'head', 'catEars');
  assert.ok(worn.ok && worn.state.equipped.k?.head === 'catEars');
  const off = worn.ok ? equip(worn.state, 'k', 'head', null) : worn;
  assert.ok(off.ok && !('k' in off.state.equipped));
});

test('git push에 성공하면 5코인: 훅이 준 명령으로도, 대화 기록처럼 명령 없이 와도 센다', () => {
  const push = (command: string) => applyClaudeHook(undefined, e({ tool_name: 'Bash', tool_input: { command } }), 1);
  const done = (response: unknown = { exit_code: 0 }) => e({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: response });
  const started = push('git push origin main');
  assert.deepEqual(rewardsFor(started, started, { ...done(), tool_input: { command: 'git push origin main' } }), ['push']);
  assert.deepEqual(rewardsFor(started, started, done()), ['push']); // 명령 없이 끝 이벤트만 (대화 기록)
  assert.deepEqual(rewardsFor(push('git -C ../web push'), started, done()), ['push']);
  assert.deepEqual(rewardsFor(started, started, done({ exit_code: 1 })), []); // 실패
  assert.deepEqual(rewardsFor(push('git push --dry-run'), started, done()), []);
  assert.deepEqual(rewardsFor(push('git pull && npm test'), started, done()), []);
  assert.deepEqual(rewardsFor(push('echo "git pushed"'), started, done()), []);
});
