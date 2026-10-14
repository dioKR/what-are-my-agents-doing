import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks } from './links.ts';

test('PR 주소에는 번호와 저장소 이름을 붙인다', () => {
  const [link] = extractLinks('PR을 만들었습니다: https://github.com/acme/shop-web/pull/128.', 1);
  assert.deepEqual(link, { url: 'https://github.com/acme/shop-web/pull/128', label: { ko: 'PR #128 · shop-web', en: 'PR #128 · shop-web' }, kind: 'pr', at: 1 });
});

test('localhost 주소는 http가 없어도 로컬 서버로 잡는다', () => {
  const links = extractLinks('개발 서버를 localhost:5173 에 띄웠고, 백엔드는 http://127.0.0.1:8080/api 입니다', 1);
  assert.deepEqual(links.map((l) => [l.url, l.label.ko, l.kind]), [
    ['http://127.0.0.1:8080/api', '로컬 서버 :8080/api', 'local'],
    ['http://localhost:5173', '로컬 서버 :5173', 'local']
  ]);
});

test('같은 주소는 한 번만, 쓸모없는 스키마 주소는 뺀다', () => {
  const links = extractLinks('https://vercel.app/x https://vercel.app/x "$schema": "https://json.schemastore.org/package"', 1);
  assert.equal(links.length, 1);
  assert.equal(links[0].kind, 'web');
});
