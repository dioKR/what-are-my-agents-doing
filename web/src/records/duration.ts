/** 걸린 시간을 큰 단위부터 두 개까지 나눈다. 예: 3_725_000ms → [['h', 1], ['m', 2]] */
export type DurationUnit = 'd' | 'h' | 'm' | 's';

const UNIT_MS: ReadonlyArray<[DurationUnit, number]> = [['d', 86_400_000], ['h', 3_600_000], ['m', 60_000], ['s', 1_000]];
const MAX_PARTS = 2;

export function durationParts(ms: number): Array<[DurationUnit, number]> {
  const parts: Array<[DurationUnit, number]> = [];
  let rest = Math.max(0, Math.round(ms / 1_000) * 1_000);
  for (const [unit, size] of UNIT_MS) {
    const n = Math.floor(rest / size);
    rest -= n * size;
    if (n > 0 || parts.length > 0) parts.push([unit, n]);
    if (parts.length === MAX_PARTS) break;
  }
  const meaningful = parts.filter(([, n]) => n > 0);
  return meaningful.length ? meaningful : [['s', 0]];
}
