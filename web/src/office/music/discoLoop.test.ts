// 악보 데이터 검사: 마디마다 16칸, 음 이름이 올바른지, 루프 길이가 박자와 맞는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BPM, LEAD, LOOP_BARS, LOOP_SECONDS, leadNotes, midiOf } from './discoLoop.ts';

test('음 이름을 MIDI 번호로 바꾼다', () => {
  assert.equal(midiOf('A4'), 69);
  assert.equal(midiOf('C5'), 72);
  assert.throws(() => midiOf('H2'));
});

test('멜로디는 8마디 × 16칸 안에 있고, 루프 길이는 박자와 맞는다', () => {
  assert.equal(LEAD.length, LOOP_BARS);
  LEAD.forEach((bar, i) => assert.equal(bar.split(' ').length, 16, `${i + 1}번째 마디가 16칸이 아님`));
  const notes = leadNotes();
  assert.ok(notes.length > 40);
  for (const note of notes) {
    assert.ok(note.step >= 0 && note.step < LOOP_BARS * 16, `범위 밖 칸: ${note.step}`);
    assert.ok(note.length >= 1 && note.length <= 4);
  }
  assert.ok(Math.abs(LOOP_SECONDS - (LOOP_BARS * 4 * 60) / BPM) < 1e-9);
});
