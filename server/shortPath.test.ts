import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { shortPath } from './shortPath.ts';

test('작업 폴더 안이면 상대 경로를 "/"로, 밖이면 파일 이름만 (맥·리눅스)', () => {
  assert.equal(shortPath('/repo/src/a.ts', '/repo', Infinity, path.posix), 'src/a.ts');
  assert.equal(shortPath('/other/b.ts', '/repo', Infinity, path.posix), 'b.ts');
});

test('윈도우 경로도 "/"로 보이고, 다른 드라이브면 파일 이름만', () => {
  assert.equal(shortPath('C:\\repo\\src\\a.ts', 'C:\\repo', Infinity, path.win32), 'src/a.ts');
  assert.equal(shortPath('D:\\data\\b.ts', 'C:\\repo', Infinity, path.win32), 'b.ts');
});

test('너무 긴 상대 경로는 파일 이름만', () => {
  assert.equal(shortPath('/repo/a/very/deep/folder/file.ts', '/repo', 10, path.posix), 'file.ts');
});
