// 카드에 쓰는 작은 얼굴 그림. 같은 생김새는 한 번 만들어 재사용한다.
import { DOLL_W, dollFrame } from './character/doll.ts';
import type { Look } from './look.ts';

const FACE_TOP = 3;
const FACE_ROWS = 25; // 머리 위 소품부터 턱까지
const cache = new Map<string, string>();

export function portraitOf(look: Look): string {
  const key = JSON.stringify(look.doll);
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = DOLL_W; canvas.height = FACE_ROWS;
  canvas.getContext('2d')!.drawImage(dollFrame(look.doll, 'down', 'stand', 'normal'), 0, FACE_TOP, DOLL_W, FACE_ROWS, 0, 0, DOLL_W, FACE_ROWS);
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

const previewCache = new Map<string, string>();

/** 꾸미기 미리보기용 전신 그림 */
export function previewOf(doll: Look['doll']): string {
  const key = JSON.stringify(doll);
  const cached = previewCache.get(key);
  if (cached) return cached;
  const url = dollFrame(doll, 'down', 'stand', 'happy').toDataURL();
  previewCache.set(key, url);
  return url;
}
