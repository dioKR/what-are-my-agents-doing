// 서버를 실제로 켜고 HTTP로 두드려 보는 통합 테스트. 홈 폴더를 임시 폴더로 바꿔 내 컴퓨터의 기록·지갑을 건드리지 않는다.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = mkdtempSync(join(tmpdir(), 'wamad-test-'));
process.env.HOME = home;
process.env.USERPROFILE = home;
const webRoot = join(home, 'web');
mkdirSync(webRoot);
writeFileSync(join(webRoot, 'index.html'), '<!doctype html><title>wamad test</title>');
// 홈 폴더를 바꾼 뒤에 불러와야 지갑·대화 기록 경로가 임시 폴더를 가리킨다
const { startServer } = await import('./app.ts');

let server: Awaited<ReturnType<typeof startServer>>;
before(async () => { server = await startServer({ port: 0, webRoot }); });
after(() => server.stop());

const hook = (event: Record<string, unknown>) =>
  fetch(`${server.url}/api/events/claude`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: 'it-1', cwd: '/work/demo', ...event }) });
const post = (path: string, body: unknown) => fetch(`${server.url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const json = async (path: string) => (await fetch(`${server.url}${path}`)).json();

test('화면 파일과 API가 응답한다', async () => {
  assert.match(await (await fetch(server.url)).text(), /wamad test/);
  assert.deepEqual(await json('/api/agents'), []);
  assert.equal((await fetch(`${server.url}/api/nope`, { method: 'DELETE' })).status, 405);
});

test('훅 이벤트를 보내면 에이전트가 생기고, 일을 마치면 코인을 번다', async () => {
  assert.equal((await hook({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: '/work/demo/a.ts' } })).status, 204);
  const [agent] = await json('/api/agents');
  assert.equal(agent.id, 'it-1');
  assert.equal(agent.activity, 'working');
  await hook({ hook_event_name: 'Stop' });
  const wallet = await json('/api/wallet');
  assert.equal(wallet.coins, 1);
  assert.equal(wallet.recent[0].reason, 'turn');
});

test('실시간 연결은 판 번호가 붙은 첫 목록과 지갑을 보낸다', async () => {
  const controller = new AbortController();
  const res = await fetch(`${server.url}/api/stream`, { signal: controller.signal });
  const reader = res.body!.getReader();
  let text = '';
  while (!text.includes('"type":"wallet"')) text += new TextDecoder().decode((await reader.read()).value);
  controller.abort();
  const first = JSON.parse(text.split('\n\n')[0].replace(/^data: /, ''));
  assert.equal(first.type, 'snapshot');
  assert.equal(typeof first.protocol, 'number');
});

test('상점: 코인이 모자라면 못 사고, 잘못된 요청은 400', async () => {
  assert.equal((await post('/api/shop/buy', { itemId: 'catEars' })).status, 400);
  assert.equal((await post('/api/shop/buy', { itemId: 'no-such-item' })).status, 400);
  assert.equal((await post('/api/shop/equip', { key: 'k', slot: 'hat', itemId: 'catEars' })).status, 400);
  assert.equal((await post('/api/shop/equip', { key: 'k', slot: 'head', itemId: 'catEars' })).status, 400);
});

test('깨진 JSON을 보내도 서버가 죽지 않는다', async () => {
  const res = await fetch(`${server.url}/api/events/claude`, { method: 'POST', body: '{not json' });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(await json('/api/agents')));
});
