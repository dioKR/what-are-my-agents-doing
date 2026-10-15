// 실제 화면 검사: 서버를 켜고 브라우저(설치된 Chrome)로 열어, 오류 없이 그려지고 기본 흐름이 되는지 본다.
// npm run build 로 화면 파일을 만든 뒤 실행한다 (npm run test:e2e). 실패하면 e2e-artifacts/ 에 화면을 남긴다.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const home = mkdtempSync(join(tmpdir(), 'wamad-e2e-'));
// 지갑에 코인을 넣어 두고 시작한다 (상점에서 사 보기 위해)
mkdirSync(join(home, '.wamad'));
writeFileSync(join(home, '.wamad', 'wallet.json'), JSON.stringify({ coins: 200, owned: [], equipped: {}, recent: [] }));

let server, browser, page, url;
const pageErrors = [];

before(async () => {
  server = spawn(process.execPath, ['server/index.ts'], { env: { ...process.env, HOME: home, USERPROFILE: home, WAMAD_PORT: '0' } });
  url = await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => { const m = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/); if (m) resolve(m[0]); });
    server.on('exit', (code) => reject(new Error(`서버가 꺼짐 (${code})`)));
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  page.on('pageerror', (error) => pageErrors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push(`console: ${msg.text()}`); });
  await page.goto(`${url}/?time=day`);
});

after(async (context) => {
  if (page && pageErrors.length) {
    mkdirSync('e2e-artifacts', { recursive: true });
    await page.screenshot({ path: 'e2e-artifacts/failure.png' });
  }
  await browser?.close();
  server?.kill();
});

const hook = (sessionId, event) => fetch(`${url}/api/events/claude`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id: sessionId, cwd: `/work/${sessionId}`, session_title: `E2E ${sessionId}`, ...event })
});

test('지도가 그려진다 (캔버스가 비어 있지 않다)', async () => {
  await page.waitForSelector('#map');
  await page.waitForTimeout(500);
  const painted = await page.evaluate(() => {
    const canvas = document.getElementById('map');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) colored++;
    return colored;
  });
  assert.ok(painted > 100, `칠해진 픽셀이 너무 적음: ${painted}`);
});

test('훅 이벤트를 보내면 캐릭터와 카드가 나타난다', async () => {
  await hook('alpha', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' } });
  await hook('beta', { hook_event_name: 'PreToolUse', tool_name: 'WebSearch', tool_input: { query: 'pixel art' } });
  await hook('beta', { hook_event_name: 'AssistantText', assistant_text: 'PR: https://github.com/acme/demo/pull/1' });
  await page.waitForSelector('.tag:has-text("E2E alpha")', { timeout: 5000 });
  await page.waitForSelector('[data-select="beta"]', { timeout: 5000 });
});

test('상점: 열고, 펫을 사고, 고른 캐릭터에게 데리고 다니게 한다', async () => {
  await page.click('[data-select="alpha"]');
  await page.click('[data-shop-open]');
  await page.waitForSelector('dialog.shop[open] .shop-card');
  assert.equal(await page.locator('.shop-card').count(), 6);
  await page.click('[data-shop-tab="pet"]');
  await page.waitForSelector('[data-shop-buy="chick"]');
  const before = (await (await fetch(`${url}/api/wallet`)).json()).coins;
  await page.click('[data-shop-buy="chick"]');
  await page.waitForSelector('[data-shop-equip="chick"]');
  await page.click('[data-shop-equip="chick"]');
  await page.waitForSelector('[data-shop-unequip="pet"]');
  const wallet = await (await fetch(`${url}/api/wallet`)).json();
  assert.equal(wallet.coins, before - 60); // 병아리 값
  assert.equal(Object.values(wallet.equipped)[0].pet, 'chick');
  await page.click('[data-shop-close]');
});

test('설정에서 언어를 바꾸면 제목이 바뀐다', async () => {
  if (await page.locator('dialog.shop[open]').count()) await page.keyboard.press('Escape');
  await page.click('#settings summary');
  await page.click('[data-lang="ko"]');
  assert.equal(await page.textContent('h1'), '내 에이전트들은 뭘 하고 있을까?');
  await page.click('[data-lang="en"]'); // 설정 창은 아직 열려 있다
  assert.equal(await page.textContent('h1'), 'What Are My Agents Doing?');
});

test('기록실: 요청을 받고 도구를 써서 끝낸 작업이 기록에 남는다', async () => {
  if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
  await hook('gamma', { hook_event_name: 'UserPromptSubmit', prompt: '기록 남겨 줘' });
  await hook('gamma', { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: '/work/gamma/a.ts' } });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await hook('gamma', { hook_event_name: 'Stop' });
  await page.click('[data-records-open]');
  await page.waitForSelector('dialog.records[open] .record-card');
  await page.waitForSelector('dialog.records .record-request:has-text("기록 남겨 줘")');
  const records = await (await fetch(`${url}/api/records`)).json();
  assert.equal(records.totals.turns, 1);
  assert.ok(records.peakBusy.count >= 1);
  mkdirSync('e2e-artifacts', { recursive: true });
  await page.locator('dialog.records').screenshot({ path: 'e2e-artifacts/records.png' });
  await page.click('[data-records-close]');
});

/** 지도 캔버스에 시트 검사용 초록(#00ff40)이 있는지 (브라우저 안에서 실행) */
function hasSheetGreen() {
  const canvas = document.getElementById('map');
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < data.length; i += 4) if (data[i + 1] > 200 && data[i] < 60 && data[i + 2] < 120) return true;
  return false;
}

test('캐릭터 시트: 템플릿을 내려받고, 그린 시트를 올리면 그 캐릭터가 지도에 나온다', async () => {
  if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
  await page.click('[data-select="alpha"]');
  await page.click('[data-customize="alpha"]');
  assert.equal(await page.evaluate(hasSheetGreen), false, '올리기 전부터 지도에 시트 초록색이 있으면 이 검사가 의미 없다');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-sheet-template]')]);
  assert.equal(download.suggestedFilename(), 'wamad-character-sheet.png');

  // 꼭 그려야 하는 칸(앞 · 뒤 · 왼쪽 × 서기 · 걷기 2장)을 눈에 띄는 초록으로 칠한 시트
  const dataUrl = await page.evaluate(() => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 352, height: 176 });
    const g = canvas.getContext('2d');
    g.fillStyle = '#00ff40';
    for (const row of [0, 1, 2]) for (const col of [0, 1, 2]) g.fillRect(col * 32 + 8, row * 44 + 10, 16, 32);
    return canvas.toDataURL('image/png');
  });
  mkdirSync(join(home, 'sheets'), { recursive: true });
  const sheetPath = join(home, 'sheets', '초록이.png');
  writeFileSync(sheetPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await page.setInputFiles('[data-sheet-upload]', sheetPath);
  await page.waitForSelector('.sheet-status:has-text("초록이")');
  await page.waitForSelector('.sheet-choice.on');
  assert.equal((await (await fetch(`${url}/api/characters`)).json()).length, 1);

  // 지도에 초록 캐릭터가 그려진다
  await page.waitForFunction(hasSheetGreen, null, { timeout: 5000 });
  await page.click('form[data-look-form] button[type="submit"]');
});

test('허용 · 거부: 앱에서 누른 대답이 훅으로 돌아가고, 다른 사이트의 요청은 막는다', async () => {
  if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
  const ask = (command) => fetch(`${url}/api/permission/claude`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 'perm', cwd: '/work/perm', hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command } })
  }).then((r) => r.text());

  // 꺼져 있으면 기다리지 않고 빈 대답 (터미널에서 묻는다)
  assert.equal(await ask('ls'), '');

  await page.click('#settings summary');
  await page.check('#approvalsEnabled');
  await page.waitForFunction(async (u) => (await (await fetch(`${u}/api/settings`)).json()).approvals, url);
  await page.click('#settings summary');

  const allowed = ask('npm test');
  await page.click('[data-select="perm"]');
  await page.waitForSelector('.approval code:has-text("npm test")');
  await page.click('[data-approve]');
  assert.equal(JSON.parse(await allowed).hookSpecificOutput.decision.behavior, 'allow');

  const denied = ask('rm -rf build');
  await page.waitForSelector('.approval code:has-text("rm -rf build")'); // 앞 질문의 단추가 아니라 새 질문의 단추를 누르도록
  await page.click('[data-deny]');
  assert.equal(JSON.parse(await denied).hookSpecificOutput.decision.behavior, 'deny');

  // 다른 사이트에서 보낸 대답 · 설정 바꾸기는 막는다
  const evil = { 'Content-Type': 'application/json', Origin: 'https://evil.example' };
  assert.equal((await fetch(`${url}/api/permission/decide`, { method: 'POST', headers: evil, body: '{"id":"x","decision":"allow"}' })).status, 403);
  assert.equal((await fetch(`${url}/api/settings`, { method: 'POST', headers: evil, body: '{"approvals":false}' })).status, 403);
});

test('지금까지 브라우저 오류가 없다', () => {
  assert.deepEqual(pageErrors, []);
});
