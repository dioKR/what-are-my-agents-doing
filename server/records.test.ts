import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyClaudeHook, type ClaudeHookPayload } from './claudeHook.ts';
import { countToolCall, countTurn, noteBusyCount, noteLifetime, TurnTracker } from './records.ts';
import { EMPTY_RECORDS, type TimedRecord } from '../shared/records.ts';

const e = (o: Partial<ClaudeHookPayload>): ClaudeHookPayload => ({ session_id: 's', hook_event_name: 'PreToolUse', ...o });
const turn = (ms: number, at = 100): TimedRecord => ({ ms, at, who: '쇼핑몰', nameKey: 'claude-code:/r', request: null });

test('작업은 요청부터 끝날 때까지 재고, 도구를 한 번도 안 쓴 대답은 세지 않는다', () => {
  const turns = new TurnTracker();
  assert.equal(turns.apply('a', e({ hook_event_name: 'UserPromptSubmit', prompt: '  로그인 고쳐 줘  ' }), 1_000), null);
  assert.equal(turns.apply('a', e({ tool_name: 'Edit' }), 2_000), null);
  assert.deepEqual(turns.apply('a', e({ hook_event_name: 'Stop' }), 61_000), { ms: 60_000, request: '로그인 고쳐 줘' });

  // 도구 없이 대답만 한 작업
  turns.apply('a', e({ hook_event_name: 'UserPromptSubmit', prompt: '안녕' }), 70_000);
  assert.equal(turns.apply('a', e({ hook_event_name: 'Stop' }), 71_000), null);

  // 시작을 못 본 작업(서버를 켜기 전에 시작)은 걸린 시간을 모르니 세지 않는다
  turns.apply('b', e({ tool_name: 'Bash' }), 80_000);
  assert.equal(turns.apply('b', e({ hook_event_name: 'Stop' }), 90_000), null);
});

test('끝난 작업은 누적에 더하고, 가장 오래·빨리 끝난 기록을 바꾼다', () => {
  let state = countTurn(EMPTY_RECORDS, turn(60_000, 10));
  state = countTurn(state, turn(5_000, 20));
  state = countTurn(state, turn(30_000, 30));
  assert.deepEqual(state.totals, { turns: 3, toolCalls: 0, workMs: 95_000 });
  assert.equal(state.longestTurn?.ms, 60_000);
  assert.equal(state.fastestTurn?.ms, 5_000);
  assert.equal(state.since, 10);
  assert.equal(countToolCall(state, 40).totals.toolCalls, 1);
});

test('동시에 일한 최대 수는 넘을 때만 바뀐다', () => {
  const two = noteBusyCount(EMPTY_RECORDS, 2, 10);
  assert.deepEqual(two.peakBusy, { count: 2, at: 10 });
  assert.equal(noteBusyCount(two, 2, 20), two);
  assert.equal(noteBusyCount(EMPTY_RECORDS, 0, 20), EMPTY_RECORDS);
  assert.deepEqual(noteBusyCount(two, 3, 30).peakBusy, { count: 3, at: 30 });
});

test('가장 오래 살아 있던 에이전트: 시작부터 마지막 움직임까지', () => {
  const young = applyClaudeHook(applyClaudeHook(undefined, e({ cwd: '/r/shop', tool_name: 'Edit' }), 1_000), e({ hook_event_name: 'Stop' }), 3_000);
  const state = noteLifetime(EMPTY_RECORDS, young);
  assert.equal(state.longestLife?.ms, 2_000);
  assert.equal(state.longestLife?.who, 'shop');
  assert.equal(noteLifetime(state, young), state);
});
