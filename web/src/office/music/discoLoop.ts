// ??? 방 배경 음악: 직접 작곡한 8마디 클럽 디스코 루프. 음악 파일 없이 브라우저의 소리 합성(Web Audio)으로 연주한다.
// 악기: 킥(쿵) · 박수+스네어(짝) · 16분 하이햇(치키) · 엇박 오픈햇 · 옥타브 베이스 · 펌핑 화음 · 색소폰 같은 리드.
// 분위기만 색소폰 클럽 디스코풍이고, 멜로디는 이 프로젝트를 위해 새로 쓴 것이다.

export const BPM = 136;
const STEP = 60 / BPM / 4; // 16분음표 길이(초)
const STEPS_PER_BAR = 16;
export const LOOP_BARS = 8;
export const LOOP_SECONDS = LOOP_BARS * STEPS_PER_BAR * STEP;
/** 킥이 칠 때 화음·베이스가 이만큼까지 작아졌다가 돌아온다 (펌핑) */
const PUMP_DEPTH = 0.25;
const PUMP_RECOVER = 0.16;

/** 마디마다 화음 (Am · F · C · G 를 두 번). 베이스 뿌리음과 화음에 쓴다 */
const CHORDS: ReadonlyArray<{ root: number; notes: number[] }> = [
  { root: 45, notes: [57, 60, 64] }, // Am
  { root: 41, notes: [57, 60, 65] }, // F
  { root: 48, notes: [55, 60, 64] }, // C
  { root: 43, notes: [55, 59, 62] } // G
];

/**
 * 색소폰 리프. 한 마디 = 16칸(16분음표), 칸마다 음 이름이나 '.'(쉼표).
 * 짧게 끊어 치는 음이 기본이고, 뒤에 쉼표가 길게 오면 그만큼 끈다(최대 4칸).
 * 앞 4마디: 주제 / 뒤 4마디: 한 옥타브 위에서 터뜨리고 마지막 마디는 올라가며 다시 처음으로.
 */
export const LEAD: readonly string[] = [
  'A4 . . A4 C5 . E5 . . E5 D5 . C5 . A4 .',
  'A4 . . A4 C5 . F5 . . F5 E5 . C5 . A4 .',
  'G4 . . G4 C5 . E5 . . E5 G5 . E5 . C5 .',
  'B4 . D5 . G5 . F5 . E5 . D5 . B4 . G4 .',
  'A5 . . A5 G5 . E5 . . E5 G5 . A5 . E5 .',
  'A5 . . A5 G5 . F5 . . F5 E5 . C5 . A4 .',
  'G5 . E5 . G5 . E5 . C5 . E5 . G5 . A5 .',
  'B5 . . . G5 . . . D5 . E5 . F5 . G5 .'
];

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "A4" → MIDI 번호 69 */
export function midiOf(name: string): number {
  const match = /^([A-G])(#?)(\d)$/.exec(name);
  if (!match) throw new Error(`음 이름이 아님: ${name}`);
  return 12 * (Number(match[3]) + 1) + NOTE_INDEX[match[1]] + (match[2] ? 1 : 0);
}
const frequencyOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** 멜로디 글자를 (시작 칸, 길이 칸, MIDI) 목록으로 */
export function leadNotes(): Array<{ step: number; length: number; midi: number }> {
  const cells = LEAD.flatMap((bar) => bar.split(' '));
  const notes: Array<{ step: number; length: number; midi: number }> = [];
  cells.forEach((cell, step) => {
    if (cell === '.') return;
    let length = 1;
    while (length < 4 && cells[step + length] === '.') length++;
    notes.push({ step, length, midi: midiOf(cell) });
  });
  return notes;
}

// ---------- 악기 ----------
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

function kick(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  const osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.frequency.setValueAtTime(170, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.1);
  amp.gain.setValueAtTime(1, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(amp).connect(out);
  osc.start(t); osc.stop(t + 0.3);
  // 탁 하고 치는 앞부분
  noiseHit(ctx, out, t, 'highpass', 3000, 0.15, 0.012);
}

function noiseHit(ctx: BaseAudioContext, out: AudioNode, t: number, type: BiquadFilterType, frequency: number, level: number, decay: number): void {
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
  src.buffer = noise(ctx);
  filter.type = type; filter.frequency.value = frequency;
  amp.gain.setValueAtTime(level, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(filter).connect(amp).connect(out);
  src.start(t, Math.random()); src.stop(t + decay + 0.02);
}

/** 박수 세 겹 + 스네어 몸통: "짝" */
function clap(ctx: BaseAudioContext, out: AudioNode, t: number, level = 1): void {
  [0, 0.01, 0.02].forEach((d, i) => noiseHit(ctx, out, t + d, 'bandpass', 1400, (i === 2 ? 0.55 : 0.3) * level, i === 2 ? 0.18 : 0.025));
  const body = ctx.createOscillator(), amp = ctx.createGain();
  body.frequency.setValueAtTime(220, t);
  body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  amp.gain.setValueAtTime(0.25 * level, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  body.connect(amp).connect(out);
  body.start(t); body.stop(t + 0.14);
}

/** 루프가 다시 시작하기 직전 "쉬이익" 올라가는 소리 */
function riser(ctx: BaseAudioContext, out: AudioNode, t: number, length: number): void {
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
  src.buffer = noise(ctx);
  filter.type = 'bandpass'; filter.Q.value = 2;
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(9000, t + length);
  amp.gain.setValueAtTime(0.001, t);
  amp.gain.exponentialRampToValueAtTime(0.35, t + length);
  src.connect(filter).connect(amp).connect(out);
  src.start(t); src.stop(t + length);
}

function bass(ctx: BaseAudioContext, out: AudioNode, midi: number, t: number, length: number): void {
  const osc = ctx.createOscillator(), sub = ctx.createOscillator(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = frequencyOf(midi);
  sub.type = 'square'; sub.frequency.value = frequencyOf(midi);
  filter.type = 'lowpass'; filter.Q.value = 8;
  filter.frequency.setValueAtTime(2200, t);
  filter.frequency.exponentialRampToValueAtTime(260, t + length);
  amp.gain.setValueAtTime(0.3, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + length);
  osc.connect(filter); sub.connect(filter); filter.connect(amp).connect(out);
  osc.start(t); sub.start(t); osc.stop(t + length + 0.02); sub.stop(t + length + 0.02);
}

/** 펌핑 화음: 한 마디 내내 깔리는 밝은 화음 (킥마다 작아졌다 커진다) */
function pad(ctx: BaseAudioContext, out: AudioNode, notes: number[], t: number, length: number): void {
  for (const midi of notes) for (const detune of [-7, 7]) {
    const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = frequencyOf(midi); osc.detune.value = detune;
    filter.type = 'lowpass'; filter.frequency.value = 2600;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.022, t + 0.02);
    amp.gain.setValueAtTime(0.022, t + length - 0.05);
    amp.gain.linearRampToValueAtTime(0, t + length);
    osc.connect(filter).connect(amp).connect(out);
    osc.start(t); osc.stop(t + length + 0.02);
  }
}

/**
 * 색소폰 흉내: 톱니파 두 개(살짝 어긋나게) → 공명 필터. 반음 아래에서 미끄러져 올라가 음을 잡고(스쿱),
 * 길게 끄는 음에는 비브라토를 걸고, 숨소리 잡음을 섞는다. 짧은 음은 세게 끊어 친다.
 */
function sax(ctx: BaseAudioContext, out: AudioNode, midi: number, t: number, length: number): void {
  const f = frequencyOf(midi);
  const end = t + length;
  const mix = ctx.createGain(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
  filter.type = 'lowpass'; filter.Q.value = 5;
  filter.frequency.setValueAtTime(1200, t);
  filter.frequency.linearRampToValueAtTime(4200, t + 0.03);
  filter.frequency.linearRampToValueAtTime(2600, t + 0.15);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.34, t + 0.012);
  amp.gain.linearRampToValueAtTime(0.26, t + 0.08);
  amp.gain.setValueAtTime(0.26, Math.max(t + 0.08, end - 0.03));
  amp.gain.linearRampToValueAtTime(0, end);
  mix.connect(filter).connect(amp).connect(out);

  const vibrato = ctx.createOscillator(), vibratoDepth = ctx.createGain();
  vibrato.frequency.value = 6;
  vibratoDepth.gain.setValueAtTime(0, t);
  vibratoDepth.gain.linearRampToValueAtTime(length > 0.25 ? f * 0.01 : 0, t + Math.min(length, 0.3));
  vibrato.connect(vibratoDepth);
  for (const detune of [1, 1.005]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f * detune * 2 ** (-1 / 12), t);
    osc.frequency.exponentialRampToValueAtTime(f * detune, t + 0.035);
    vibratoDepth.connect(osc.frequency);
    osc.connect(mix);
    osc.start(t); osc.stop(end + 0.02);
  }
  vibrato.start(t); vibrato.stop(end + 0.02);

  const breath = ctx.createBufferSource(), breathFilter = ctx.createBiquadFilter(), breathAmp = ctx.createGain();
  breath.buffer = noise(ctx);
  breathFilter.type = 'bandpass'; breathFilter.frequency.value = 2200;
  breathAmp.gain.setValueAtTime(0, t);
  breathAmp.gain.linearRampToValueAtTime(0.05, t + 0.01);
  breathAmp.gain.linearRampToValueAtTime(0.012, t + 0.06);
  breathAmp.gain.linearRampToValueAtTime(0, end);
  breath.connect(breathFilter).connect(breathAmp).connect(out);
  breath.start(t, Math.random()); breath.stop(end + 0.02);
}

/** 루프 한 바퀴(8마디)를 t0초부터 연주하도록 예약한다 */
export function scheduleLoop(ctx: BaseAudioContext, out: AudioNode, t0: number): void {
  const at = (step: number) => t0 + step * STEP;
  // 화음·베이스는 펌핑 버스를 거친다: 킥마다 소리가 줄었다가 돌아온다
  const pump = ctx.createGain();
  pump.connect(out);
  const lastBar = LOOP_BARS - 1;

  noiseHit(ctx, out, at(0), 'highpass', 5000, 0.3, 1.2); // 시작 심벌
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const chord = CHORDS[bar % CHORDS.length];
    const first = bar * STEPS_PER_BAR;
    pad(ctx, pump, chord.notes, at(first), STEPS_PER_BAR * STEP);
    for (let step = 0; step < STEPS_PER_BAR; step++) {
      const s = first + step;
      const onBeat = step % 4 === 0;
      if (onBeat) {
        kick(ctx, out, at(s));
        pump.gain.setValueAtTime(PUMP_DEPTH, at(s));
        pump.gain.linearRampToValueAtTime(1, at(s) + PUMP_RECOVER);
      }
      if (step === 4 || step === 12) clap(ctx, out, at(s));
      // 하이햇: 16분음표마다, 엇박은 길게 열린 소리
      if (step % 4 === 2) noiseHit(ctx, out, at(s), 'highpass', 7500, 0.22, 0.14);
      else noiseHit(ctx, out, at(s), 'highpass', 9500, onBeat ? 0.04 : 0.08, 0.03);
      // 디스코 옥타브 베이스: 8분음표마다 뿌리음 ↔ 한 옥타브 위
      if (step % 2 === 0) bass(ctx, pump, chord.root + (step % 4 === 2 ? 12 : 0), at(s), STEP * 1.7);
    }
    if (bar === lastBar) {
      // 마지막 마디: "다다다다" 스네어 필과 올라가는 소리로 다음 바퀴를 부른다
      for (let step = 12; step < 16; step++) clap(ctx, out, at(first + step), 0.5 + (step - 12) * 0.15);
      riser(ctx, out, at(first + 8), 8 * STEP);
    }
  }
  for (const note of leadNotes()) {
    const staccato = note.length <= 2;
    sax(ctx, out, note.midi, at(note.step), note.length * STEP * (staccato ? 0.7 : 0.92));
  }
}

/** 음량을 맞추고 소리가 깨지지 않게 하는 마지막 단(압축기 → 전체 음량) */
export function createMasterBus(ctx: BaseAudioContext, volume: number): { input: AudioNode; gain: GainNode } {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16; compressor.ratio.value = 5; compressor.attack.value = 0.003; compressor.release.value = 0.12;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  compressor.connect(gain).connect(ctx.destination);
  return { input: compressor, gain };
}
