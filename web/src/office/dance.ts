// ??? 방의 춤. 춤마다 동작(자세 + 뛰어오르는 높이) 순서, 박자, 바라보는 방향이 있다.
// 캐릭터마다 몇 초씩 춤을 바꿔 춘다 (서로 다른 때에 바뀌도록 자리 번호만큼 어긋나게).
import type { Facing, Pose } from './character/doll.ts';

export interface DanceMove { pose: Pose; lift: number }

interface Dance {
  moves: readonly DanceMove[];
  beatsPerSecond: number;
  /** 도는 방향 순서 */
  facings: readonly Facing[];
  turnsPerSecond: number;
}

/** 디스코: 두 팔 번쩍 → 모음(살짝 점프) → 한 팔 → 모음, 앞 · 옆으로 돌면서 */
const DISCO: Dance = {
  moves: [{ pose: 'stretch', lift: 0 }, { pose: 'stand', lift: 2 }, { pose: 'raise', lift: 0 }, { pose: 'stand', lift: 2 }],
  beatsPerSecond: 4,
  facings: ['down', 'left', 'down', 'right'],
  turnsPerSecond: 2
};

/** 해파리: 두 팔을 옆으로 펴고 손끝을 위아래로 물결치며 둥실둥실 떠오른다. 팔이 잘 보이게 앞만 본다 */
const JELLYFISH: Dance = {
  moves: [{ pose: 'jelly1', lift: 0 }, { pose: 'jelly1', lift: 1 }, { pose: 'jelly2', lift: 2 }, { pose: 'jelly2', lift: 1 }],
  beatsPerSecond: 3,
  facings: ['down'],
  turnsPerSecond: 0
};

const DANCES: readonly Dance[] = [DISCO, JELLYFISH];
/** 한 춤을 추는 시간(초) */
const DANCE_SECONDS = 8;

/** slot: 캐릭터 자리 번호, time: 화면이 켜진 뒤 흐른 시간(초) */
const danceAt = (slot: number, time: number): Dance => DANCES[Math.floor(time / DANCE_SECONDS + slot) % DANCES.length];

export function danceMoveAt(slot: number, time: number): DanceMove {
  const dance = danceAt(slot, time);
  return dance.moves[Math.floor(time * dance.beatsPerSecond + slot) % dance.moves.length];
}

export function danceFacingAt(slot: number, time: number): Facing {
  const dance = danceAt(slot, time);
  return dance.facings[Math.floor(time * dance.turnsPerSecond + slot) % dance.facings.length];
}
