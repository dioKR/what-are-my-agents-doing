// 데스크톱 앱 검사: Electron 앱을 실제로 띄워, 창에 오류 화면 대신 사무실 지도가 그려지는지 본다.
// 화면이 있는 컴퓨터(맥 · 윈도우)에서만 돈다: npm run test:desktop (파일 이름이 .test.mjs가 아니라서 화면 없는 리눅스 검사(test:e2e)에는 섞이지 않는다)
// WAMAD_APP_EXE에 설치된 앱 실행 파일을 주면 저장소 대신 그 앱을 띄운다 (설치 파일 검사용).
// 성공해도 실패해도 e2e-artifacts/desktop.png 에 창 화면을 남긴다 — 맥에서 윈도우 화면을 볼 수 있게.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron } from 'playwright-core';

// 실제 ~/.claude 설정을 건드리지 않도록 빈 홈 폴더로 띄운다
const home = mkdtempSync(join(tmpdir(), 'wamad-desktop-'));
const installedExe = process.env.WAMAD_APP_EXE;

let app, window;
const pageErrors = [];

before(async () => {
  app = await electron.launch({
    ...(installedExe ? { executablePath: installedExe } : { args: ['.'] }),
    env: { ...process.env, HOME: home, USERPROFILE: home }
  });
  window = await app.firstWindow();
  window.on('pageerror', (error) => pageErrors.push(`pageerror: ${error.message}`));
  window.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push(`console: ${msg.text()}`); });
});

after(async () => {
  if (window) {
    mkdirSync('e2e-artifacts', { recursive: true });
    await window.screenshot({ path: 'e2e-artifacts/desktop.png' }).catch(() => {});
  }
  await app?.close();
});

test('앱 창에 오류 화면이 아니라 사무실 지도가 그려진다', async () => {
  await window.waitForSelector('#map', { timeout: 20_000 });
  await window.waitForTimeout(500);
  const painted = await window.evaluate(() => {
    const canvas = document.getElementById('map');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) colored++;
    return colored;
  });
  assert.ok(painted > 100, `칠해진 픽셀이 너무 적음: ${painted}`);
});

test('앱 화면에 오류가 없다', () => {
  assert.deepEqual(pageErrors, []);
});
