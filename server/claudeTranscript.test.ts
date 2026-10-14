import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TranscriptReader } from './claudeTranscript.ts';

const line = (o: object) => JSON.stringify({ sessionId: 's1', cwd: '/repo', ...o });

test('도구 사용과 결과를 PreToolUse/PostToolUse로 바꾸고, 결과 줄에 도구 이름을 채운다', () => {
  const reader = new TranscriptReader('/t.jsonl');
  const pre = reader.toHookEvents(line({ type: 'assistant', message: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'u1', name: 'Bash', input: { command: 'npm test' } }] } }));
  assert.equal(pre[0].hook_event_name, 'PreToolUse');
  assert.deepEqual(pre[0].tool_input, { command: 'npm test' });
  const post = reader.toHookEvents(line({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'u1', is_error: true }] } }));
  assert.equal(post[0].tool_name, 'Bash');
  assert.deepEqual(post[0].tool_response, { is_error: true });
});

test('대답을 마치면 Stop, 사람이 쓴 요청은 UserPromptSubmit', () => {
  const reader = new TranscriptReader('/t.jsonl');
  assert.equal(reader.toHookEvents(line({ type: 'assistant', message: { stop_reason: 'end_turn', content: [{ type: 'text' }] } }))[0].hook_event_name, 'Stop');
  assert.equal(reader.toHookEvents(line({ type: 'user', message: { content: '결제 화면 고쳐줘' } }))[0].hook_event_name, 'UserPromptSubmit');
  assert.equal(reader.toHookEvents(line({ type: 'user', message: { content: '<command-name>/clear</command-name>' } })).length, 0);
});

test('하위 에이전트 결과가 오면 SubagentStop도 함께 낸다', () => {
  const reader = new TranscriptReader('/t.jsonl');
  reader.toHookEvents(line({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u2', name: 'Task', input: { subagent_type: 'Explore' } }] } }));
  const events = reader.toHookEvents(line({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'u2' }] } }));
  assert.deepEqual(events.map((e) => e.hook_event_name), ['PostToolUse', 'SubagentStop']);
});

test('하위 에이전트 내부 기록(sidechain)과 깨진 줄은 무시한다', () => {
  const reader = new TranscriptReader('/t.jsonl');
  assert.equal(reader.toHookEvents(line({ type: 'assistant', isSidechain: true, message: { content: [{ type: 'tool_use', id: 'x', name: 'Read' }] } })).length, 0);
  assert.equal(reader.toHookEvents('{broken').length, 0);
});

test('기록에 적힌 시각을 이벤트 시각으로 쓴다', () => {
  const reader = new TranscriptReader('/t.jsonl');
  const [event] = reader.toHookEvents(line({ type: 'user', timestamp: '2026-10-14T05:00:00.000Z', message: { content: '안녕' } }));
  assert.equal(event.observed_at, Date.parse('2026-10-14T05:00:00.000Z'));
});

test('세션 제목 줄은 이벤트를 만들지 않고, 이후 이벤트에 제목을 싣는다', () => {
  const reader = new TranscriptReader('/t.jsonl');
  assert.equal(reader.toHookEvents(line({ type: 'custom-title', customTitle: 'A/B 테스트 설계 및 구현' })).length, 0);
  const [event] = reader.toHookEvents(line({ type: 'user', message: { content: '시작' } }));
  assert.equal(event.session_title, 'A/B 테스트 설계 및 구현');
});

test('에이전트가 쓴 글은 AssistantText로, 사람 요청은 prompt를 싣는다', () => {
  const reader = new TranscriptReader('/t.jsonl');
  const events = reader.toHookEvents(line({ type: 'assistant', message: { content: [{ type: 'text', text: '테스트부터 고치겠습니다.' }, { type: 'tool_use', id: 'u9', name: 'Bash', input: { command: 'npm test' } }] } }));
  assert.deepEqual(events.map((e) => e.hook_event_name), ['AssistantText', 'PreToolUse']);
  assert.equal(events[0].assistant_text, '테스트부터 고치겠습니다.');
  assert.equal(reader.toHookEvents(line({ type: 'user', message: { content: '결제 고쳐줘' } }))[0].prompt, '결제 고쳐줘');
});

test('에이전트 팀원 기록: 곁가지 줄도 읽고, 팀원 표시를 붙이고, 리더가 보낸 말을 맡은 일로 받는다', () => {
  const reader = new TranscriptReader('/p/lead/subagents/agent-apo-1.jsonl', { name: 'po', agentType: 'po' });
  const base = { sessionId: 'lead', agentId: 'apo-1', isSidechain: true, cwd: '/repo', timestamp: '2026-10-14T11:10:20.323Z' };
  const [received] = reader.toHookEvents(JSON.stringify({ ...base, type: 'user', message: { content: '<teammate-message teammate_id="team-lead" summary="대기">\n회의실에서 대기하세요.\n</teammate-message>' } }));
  assert.equal(received.hook_event_name, 'UserPromptSubmit');
  assert.equal(received.prompt, '회의실에서 대기하세요.');
  assert.deepEqual([received.session_id, received.agent_id, received.agent_type, received.teammate_name], ['lead', 'apo-1', 'po', 'po']);
  const [sent] = reader.toHookEvents(JSON.stringify({ ...base, type: 'assistant', message: { content: [{ type: 'tool_use', id: 'm1', name: 'SendMessage', input: { to: 'team-lead', message: 'PO 대기 중입니다.' } }] } }));
  assert.equal(sent.tool_name, 'SendMessage');
  assert.equal(sent.teammate_name, 'po');
});
