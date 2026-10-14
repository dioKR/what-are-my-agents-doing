import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyClaudeHook, classifyMailTool, describeTool, didToolFail, type ClaudeHookPayload } from './claudeHook.ts';
import { contextRatio, lastContextTokens } from './transcript.ts';
import { STUCK_FAIL_STREAK, type AgentSnapshot } from '../shared/protocol.ts';

const NOW = 1_000;
const event = (hook_event_name: string, extra: Partial<ClaudeHookPayload> = {}): ClaudeHookPayload =>
  ({ session_id: 's1', cwd: '/repo', hook_event_name, ...extra });
const run = (...events: ClaudeHookPayload[]): AgentSnapshot =>
  events.reduce<AgentSnapshot | undefined>((agent, e) => applyClaudeHook(agent, e, NOW), undefined)!;

test('도구를 쓰면 작업 중이 되고, 파일 경로는 작업 폴더 기준으로 짧게 보인다', () => {
  const agent = run(event('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: '/repo/src/app.ts' } }));
  assert.equal(agent.activity, 'working');
  assert.equal(agent.detail, 'Edit src/app.ts');
});

test('권한 알림이 오면 승인 대기, 멈추면 다음 지시 대기', () => {
  assert.equal(run(event('Notification', { message: 'Claude needs your permission to use Bash' })).activity, 'waiting-permission');
  assert.equal(run(event('Stop')).activity, 'waiting-user');
});

test('요약 직전에는 compacting, 요약 뒤 다시 시작하면 thinking', () => {
  assert.equal(run(event('PreCompact')).activity, 'compacting');
  assert.equal(run(event('PreCompact'), event('SessionStart', { source: 'compact' })).activity, 'thinking');
});

test('Slack 보내기 도구는 우편 기록으로 남는다', () => {
  const agent = run(event('PreToolUse', {
    tool_name: 'mcp__slack__slack_post_message',
    tool_input: { channel: '#backend', text: 'API 질문 3개 정리했습니다' },
    tool_use_id: 't1'
  }));
  assert.equal(agent.activity, 'mail-send');
  assert.deepEqual(agent.mail[0], { id: 't1', at: NOW, direction: 'sent', channel: 'Slack', target: '#backend', preview: 'API 질문 3개 정리했습니다' });
});

test('메일 도구 분류', () => {
  assert.deepEqual(classifyMailTool('mcp__gmail__send_email'), { channel: 'Gmail', direction: 'sent' });
  assert.deepEqual(classifyMailTool('mcp__slack__slack_get_channel_history'), { channel: 'Slack', direction: 'read' });
  assert.equal(classifyMailTool('mcp__github__create_issue'), null);
  assert.equal(classifyMailTool('Bash'), null);
});

test('같은 명령이 연달아 실패하면 stuck, 한 번 성공하면 풀린다', () => {
  const fail = event('PostToolUse', { tool_name: 'Bash', tool_response: { exit_code: 1 } });
  const failures = Array.from({ length: STUCK_FAIL_STREAK }, () => fail);
  const stuck = run(...failures);
  assert.equal(stuck.activity, 'stuck');
  const recovered = applyClaudeHook(stuck, event('PostToolUse', { tool_name: 'Bash', tool_response: { exit_code: 0 } }), NOW);
  assert.equal(recovered.activity, 'thinking');
  assert.equal(recovered.failStreak, 0);
});

test('하위 에이전트는 Task로 늘고 SubagentStop으로 준다', () => {
  const started = run(event('PreToolUse', { tool_name: 'Task', tool_input: { subagent_type: 'Explore' } }));
  assert.equal(started.subagents[0].label, 'Explore');
  assert.equal(applyClaudeHook(started, event('SubagentStop'), NOW).subagents.length, 0);
});

test('이름을 붙여 팀원을 만드는 Agent 호출은 하위 에이전트로 세지 않는다', () => {
  const lead = run(event('PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'po', name: 'po', description: 'PO teammate' } }));
  assert.equal(lead.subagents.length, 0);
});

test('TodoWrite는 할 일 목록을 바꾼다', () => {
  const agent = run(event('PreToolUse', { tool_name: 'TodoWrite', tool_input: { todos: [{ content: 'A', status: 'completed' }, { content: 'B', status: 'weird' }] } }));
  assert.deepEqual(agent.todos, [{ content: 'A', status: 'completed' }, { content: 'B', status: 'pending' }]);
});

test('실패 판정', () => {
  assert.equal(didToolFail({ exit_code: 2 }), true);
  assert.equal(didToolFail({ is_error: true }), true);
  assert.equal(didToolFail({ stdout: 'ok' }), false);
  assert.equal(didToolFail('text'), false);
});

test('describeTool은 명령을 줄여 보여준다', () => {
  assert.equal(describeTool('Bash', { command: 'npm test' }, '/repo'), 'Bash npm test');
  assert.equal(describeTool('Grep', { pattern: 'usePayment' }, '/repo'), 'Grep usePayment');
});

test('대화 기록 끝에서 마지막 토큰 사용량을 읽는다', () => {
  const tail = 'broken line\n' + JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 1, cache_creation_input_tokens: 9, cache_read_input_tokens: 90 } } }) + '\n{"type":"user"}\n';
  assert.equal(lastContextTokens(tail), 100);
  assert.equal(contextRatio(100_000), 0.5);
  assert.equal(contextRatio(500_000), 0.5);
});

test('MCP 도구는 서버:도구로 줄여 보이고, 우편 도구는 통로와 대상을 보여준다', () => {
  assert.equal(describeTool('mcp__github__create_issue', {}, '/repo'), 'github:create_issue');
  const agent = run(event('PreToolUse', { tool_name: 'mcp__gmail__send_email', tool_input: { to: 'jiwoo@company.com' } }));
  assert.equal(agent.summary.en, 'Sending to Gmail jiwoo@company.com');
});

test('요청·설명·최근 활동이 쌓인다', () => {
  const agent = run(
    event('UserPromptSubmit', { prompt: 'A/B 테스트 설계해줘' }),
    event('AssistantText', { assistant_text: '먼저 지표를 확인하겠습니다.' }),
    event('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test' } })
  );
  assert.equal(agent.request, 'A/B 테스트 설계해줘');
  assert.equal(agent.narration, '먼저 지표를 확인하겠습니다.');
  assert.equal(agent.summary.ko, '테스트 돌리는 중');
  assert.deepEqual(agent.recent.map((r) => r.text.ko), ['테스트 돌리는 중', '요청 받음: A/B 테스트 설계해줘']);
});

test('에이전트 글과 명령 결과에 나온 링크가 쌓이고, 같은 주소는 앞으로 옮겨진다', () => {
  const agent = run(
    event('PostToolUse', { tool_name: 'Bash', tool_response: { stdout: 'https://github.com/acme/web/pull/7\n' } }),
    event('AssistantText', { assistant_text: '서버를 localhost:3000 에 띄웠습니다. PR은 https://github.com/acme/web/pull/7 입니다.' })
  );
  assert.deepEqual(agent.links.map((l) => l.label.ko), ['PR #7 · web', '로컬 서버 :3000']);
});
