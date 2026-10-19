import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { ApprovalDesk, isTrustedPageRequest, permissionHookOutput } from './approvals.ts';

const fields = { agentId: 's', toolName: 'Bash', detail: 'Bash npm test', askedAt: 1 };

test('앱에서 누른 대답을 돌려주고, 질문 목록에서 뺀다', async () => {
  const desk = new ApprovalDesk();
  let changes = 0;
  const { id, decision } = desk.ask(fields, 10_000, () => changes++);
  assert.equal(desk.list().length, 1);
  assert.equal(desk.list()[0].expiresAt, 10_001);
  assert.equal(desk.decide(id, 'allow'), true);
  assert.equal(await decision, 'allow');
  assert.equal(desk.list().length, 0);
  assert.equal(desk.decide(id, 'deny'), false); // 이미 끝난 질문
  assert.equal(changes, 2);
});

test('시간이 지나거나 훅 연결이 끊기면 대답 없이(null) 끝난다', async () => {
  const desk = new ApprovalDesk();
  assert.equal(await desk.ask(fields, 10, () => {}).decision, null);
  const cancelled = desk.ask(fields, 10_000, () => {});
  cancelled.cancel();
  assert.equal(await cancelled.decision, null);
  assert.equal(desk.list().length, 0);
});

test('Claude Code가 읽는 대답 모양', () => {
  assert.deepEqual(permissionHookOutput('allow'), { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
  const deny = permissionHookOutput('deny') as { hookSpecificOutput: { decision: { behavior: string; message: string } } };
  assert.equal(deny.hookSpecificOutput.decision.behavior, 'deny');
  assert.ok(deny.hookSpecificOutput.decision.message.length > 0);
});

test('이 컴퓨터의 우리 화면이 JSON으로 보낸 요청만 믿는다', () => {
  const req = (headers: Record<string, string>) => ({ headers }) as unknown as IncomingMessage;
  const json = { 'content-type': 'application/json' };
  assert.equal(isTrustedPageRequest(req({ host: '127.0.0.1:4545', origin: 'http://127.0.0.1:4545', ...json })), true);
  assert.equal(isTrustedPageRequest(req({ host: 'localhost:5173', origin: 'http://localhost:5173', ...json })), true);
  assert.equal(isTrustedPageRequest(req({ host: '127.0.0.1:4545', origin: 'https://evil.example', ...json })), false);
  assert.equal(isTrustedPageRequest(req({ host: 'evil.example:4545', origin: 'http://evil.example:4545', ...json })), false);
  assert.equal(isTrustedPageRequest(req({ host: '127.0.0.1:4545', origin: 'http://127.0.0.1:4545', 'content-type': 'text/plain' })), false);
});
