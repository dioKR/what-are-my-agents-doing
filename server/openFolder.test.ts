import { test } from 'node:test';
import assert from 'node:assert/strict';
import { folderOpener, openFolder } from './openFolder.ts';

test('운영체제마다 폴더 여는 프로그램이 다르다', () => {
  assert.equal(folderOpener('darwin'), 'open');
  assert.equal(folderOpener('win32'), 'explorer.exe');
  assert.equal(folderOpener('linux'), 'xdg-open');
});

test('없는 폴더는 열지 않는다', async () => {
  assert.equal(await openFolder('/no/such/folder/for/wamad'), false);
});
