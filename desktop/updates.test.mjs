import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLatestVersion, isNewer, parseVersion } from './updates.mjs';

test('버전 비교: 숫자 단위로 비교하고, 형식이 이상하면 새 버전으로 보지 않는다', () => {
  assert.deepEqual(parseVersion('v0.10.1'), [0, 10, 1]);
  assert.equal(isNewer('v0.3.0', '0.2.1'), true);
  assert.equal(isNewer('0.10.0', '0.9.9'), true);
  assert.equal(isNewer('0.2.1', '0.2.1'), false);
  assert.equal(isNewer('0.2.0', '0.2.1'), false);
  assert.equal(isNewer('nightly', '0.2.1'), false);
});

test('최신 버전 확인: 실패하면 null, 성공하면 v를 뗀 번호', async () => {
  const ok = async () => ({ ok: true, json: async () => ({ tag_name: 'v0.3.0' }) });
  assert.equal(await fetchLatestVersion(ok), '0.3.0');
  assert.equal(await fetchLatestVersion(async () => ({ ok: false })), null);
  assert.equal(await fetchLatestVersion(async () => { throw new Error('offline'); }), null);
});
