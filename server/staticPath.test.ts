import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { staticFilePath } from './staticPath.ts';

test('윈도우 경로 규칙에서도 "/"는 첫 화면(index.html)이다', () => {
  assert.equal(staticFilePath('C:\\app\\dist\\web', '/', path.win32), 'C:\\app\\dist\\web\\index.html');
  assert.equal(staticFilePath('C:\\app\\dist\\web', '/assets/index-abc.js', path.win32), 'C:\\app\\dist\\web\\assets\\index-abc.js');
});

test('맥·리눅스 경로 규칙', () => {
  assert.equal(staticFilePath('/app/dist/web', '/', path.posix), '/app/dist/web/index.html');
  assert.equal(staticFilePath('/app/dist/web', '/favicon.png', path.posix), '/app/dist/web/favicon.png');
});

test('화면 폴더 밖은 열지 않는다', () => {
  assert.equal(staticFilePath('/app/dist/web', '/../../etc/passwd', path.posix), '/app/dist/web/etc/passwd');
  assert.equal(staticFilePath('C:\\app\\dist\\web', '/..%5c..%5cwindows%5cwin.ini', path.win32), null);
  assert.equal(staticFilePath('/app/dist/web', '/%E0%A4%A', path.posix), null);
});
