import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeEvent } from './team.ts';
import { applyClaudeHook, type ClaudeHookPayload } from './claudeHook.ts';

const e = (o: Partial<ClaudeHookPayload>): ClaudeHookPayload => ({ session_id: 'lead', hook_event_name: 'PreToolUse', ...o });

test('리더 이벤트는 세션 키로, 팀 역할 하위 에이전트는 팀원 키로, 보통 하위 에이전트는 버린다', () => {
  assert.deepEqual(routeEvent(e({})), { key: 'lead', member: null });
  assert.deepEqual(routeEvent(e({ agent_id: 'a1', agent_type: 'frontend' })), { key: 'lead#frontend', member: { parentId: 'lead', role: 'fe', memberName: 'frontend' } });
  assert.equal(routeEvent(e({ agent_id: 'x', agent_type: 'Explore' })), null);
});

test('같은 팀원은 훅으로 오든 대화 기록으로 오든 이름으로 한 캐릭터에 모인다', () => {
  const fromHook = routeEvent(e({ agent_id: 'po@team-1', agent_type: 'po' }));
  const fromTranscript = routeEvent(e({ agent_id: 'apo-ddc2', agent_type: 'po', teammate_name: 'po' }));
  const idle = routeEvent(e({ hook_event_name: 'TeammateIdle', teammate_name: 'po' }));
  assert.equal(fromHook?.key, 'lead#po');
  assert.equal(fromTranscript?.key, 'lead#po');
  assert.equal(idle?.key, 'lead#po');
});

test('팀 할 일은 리더에, 메시지는 보낸 쪽에 쌓인다', () => {
  let lead = applyClaudeHook(undefined, e({ hook_event_name: 'TaskCreated', task_id: 't1', task_subject: '결제 API 만들기', teammate_name: 'be' }), 1);
  lead = applyClaudeHook(lead, e({ hook_event_name: 'TaskCompleted', task_id: 't1' }), 2);
  assert.deepEqual(lead.teamTasks.map((t) => [t.subject, t.owner, t.status]), [['결제 API 만들기', 'be', 'done']]);
  const sender = applyClaudeHook(undefined, e({ tool_name: 'SendMessage', tool_use_id: 'm1', tool_input: { to: 'fe', message: 'API 스펙 올렸어요' } }), 3);
  assert.deepEqual(sender.messages, [{ id: 'm1', to: 'fe', text: 'API 스펙 올렸어요', at: 3 }]);
});
