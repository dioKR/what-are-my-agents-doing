import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { CharacterStore, cleanCharacterName, pngSize, sheetProblem } from './characters.ts';
import { SHEET_HEIGHT, SHEET_WIDTH } from '../shared/characterSheet.ts';

/** 투명한 PNG를 만든다 (머리 크기 검사에는 IHDR만 쓰이지만, 실제로 열리는 파일로) */
function png(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

test('시트는 정해진 크기의 PNG만 받는다', () => {
  assert.deepEqual(pngSize(png(10, 20)), { width: 10, height: 20 });
  assert.equal(sheetProblem(png(SHEET_WIDTH, SHEET_HEIGHT)), null);
  assert.equal(sheetProblem(png(32, 44)), 'wrong-size');
  assert.equal(sheetProblem(Buffer.from('GIF89a not a png at all......')), 'not-png');
  assert.equal(sheetProblem(Buffer.alloc(600 * 1024)), 'too-large');
});

test('이름은 다듬고, 비어 있으면 기본 이름', () => {
  assert.equal(cleanCharacterName('  탄지로  '), '탄지로');
  assert.equal(cleanCharacterName(''), 'My character');
  assert.equal(cleanCharacterName(42), 'My character');
  assert.equal(cleanCharacterName('a'.repeat(40)).length, 24);
});

test('올린 시트를 저장하고, 다시 읽고, 지운다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wamad-chars-'));
  const store = new CharacterStore(dir);
  await store.load();
  const sheet = png(SHEET_WIDTH, SHEET_HEIGHT);
  const added = await store.add('도트', sheet, 1);
  assert.match(added.id, /^[0-9a-f]{12}$/);

  const reopened = new CharacterStore(dir);
  await reopened.load();
  assert.deepEqual(reopened.list, [added]);
  assert.deepEqual(await reopened.readPng(added.id), sheet);
  assert.equal(await reopened.readPng('../index'), null);

  assert.equal(await reopened.remove(added.id), true);
  assert.equal(await reopened.readPng(added.id), null);
  assert.equal(await reopened.remove(added.id), false);
});
