// ??? 방 음악 재생기. 춤추는 캐릭터를 누르면 켜고, 다시 누르거나 춤추는 캐릭터가 없어지면 끈다.
// 브라우저는 사람이 누르기 전에는 소리를 못 내게 하므로, 소리 장치(AudioContext)는 처음 누를 때 만든다.
// 소리 켜기/끄기와 음량은 이 브라우저에 기억한다.
import { createMasterBus, LOOP_SECONDS, scheduleLoop } from './discoLoop.ts';

const STORAGE_KEY = 'wamad.sound';
/** 이만큼(초) 앞까지 미리 예약해 두면 끊기지 않는다 */
const SCHEDULE_AHEAD = 1.5;
const CHECK_EVERY_MS = 400;
const FADE_SECONDS = 0.6;

export interface SoundSettings { enabled: boolean; volume: number }
const DEFAULT_SETTINGS: SoundSettings = { enabled: true, volume: 0.5 };

function readSettings(): SoundSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SoundSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export class ClubMusic {
  settings: SoundSettings = readSettings();
  private ctx: AudioContext | null = null;
  private bus: { input: AudioNode; gain: GainNode } | null = null;
  private nextLoopAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  get isPlaying(): boolean { return this.timer !== null; }

  /** 켜져 있으면 끄고, 꺼져 있으면 켠다. 소리를 꺼 두었으면 아무것도 하지 않는다 */
  toggle(): void {
    if (this.isPlaying) this.stop();
    else this.play();
  }

  play(): void {
    if (this.isPlaying || !this.settings.enabled) return;
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    // 재생할 때마다 새 출력 단을 만든다 (이전 재생의 페이드아웃과 섞이지 않게)
    this.bus = createMasterBus(this.ctx, this.settings.volume);
    this.nextLoopAt = this.ctx.currentTime + 0.05;
    this.fillAhead();
    this.timer = setInterval(() => this.fillAhead(), CHECK_EVERY_MS);
  }

  stop(): void {
    if (!this.timer || !this.ctx || !this.bus) return;
    clearInterval(this.timer);
    this.timer = null;
    // 뚝 끊기지 않게 줄이고, 다 줄면 연결을 끊어 예약해 둔 소리도 버린다
    const { gain } = this.bus;
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    setTimeout(() => gain.disconnect(), FADE_SECONDS * 1000 + 50);
    this.bus = null;
  }

  setVolume(volume: number): void {
    this.settings = { ...this.settings, volume };
    if (this.bus && this.ctx) this.bus.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    this.save();
  }

  setEnabled(enabled: boolean): void {
    this.settings = { ...this.settings, enabled };
    if (!enabled) this.stop();
    this.save();
  }

  private fillAhead(): void {
    if (!this.ctx || !this.bus) return;
    while (this.nextLoopAt < this.ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleLoop(this.ctx, this.bus.input, this.nextLoopAt);
      this.nextLoopAt += LOOP_SECONDS;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // 저장소를 못 쓰면 이번 창에서만 바뀐다
    }
  }
}
