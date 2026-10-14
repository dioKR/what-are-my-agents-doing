// 캐릭터를 졸졸 따라다니는 펫. 캐릭터가 걸어온 길을 한 칸 남짓 늦게 따라가고, 캐릭터가 멈추면 옆에 와서 선다.
import type { PetItem } from '../../../../shared/shop.ts';
import type { Actor } from '../actors.ts';
import { TILE } from '../map.ts';
import { PET_ART, PET_H, PET_W, type PetFrame } from './petArt.ts';

/** 캐릭터 뒤로 이만큼(칸) 떨어져 따라간다 */
const FOLLOW_GAP = 1.1;
/** 캐릭터가 멈추면 펫이 서는 자리 (캐릭터 발 기준, 칸) */
const REST_OFFSET = { x: 0.9, y: 0.3 };
const SPEED = 5; // 칸/초 (캐릭터보다 조금 빨라야 뒤처지지 않는다)
const TRAIL_STEP = 0.2; // 이만큼 움직일 때마다 발자취를 남긴다
const MAX_TRAIL = 40;
/** 이보다 멀리 떨어지면(캐릭터가 잠들거나 자리를 크게 옮김) 걸어가지 않고 바로 옆에 나타난다 */
const SNAP_DISTANCE = 8;
const WALK_FRAMES_PER_SECOND = 8;

export interface Pet {
  kind: PetItem;
  x: number;
  y: number;
  facing: 'left' | 'right';
  moving: boolean;
  trail: Array<{ x: number; y: number }>;
}

export class PetKeeper {
  readonly pets = new Map<string, Pet>();

  /** petOf: 캐릭터(id)가 데리고 다니는 펫. 없으면 undefined */
  update(dt: number, actors: Iterable<Actor>, petOf: (actorId: string) => PetItem | undefined): void {
    const alive = new Set<string>();
    for (const actor of actors) {
      const kind = actor.removed ? undefined : petOf(actor.id);
      if (!kind) continue;
      alive.add(actor.id);
      const pet = this.pets.get(actor.id) ?? this.adopt(actor, kind);
      pet.kind = kind;
      follow(pet, actor, dt);
    }
    for (const id of this.pets.keys()) if (!alive.has(id)) this.pets.delete(id);
  }

  private adopt(actor: Actor, kind: PetItem): Pet {
    const pet: Pet = { kind, x: actor.x + REST_OFFSET.x, y: actor.y + REST_OFFSET.y, facing: 'left', moving: false, trail: [] };
    this.pets.set(actor.id, pet);
    return pet;
  }
}

function follow(pet: Pet, actor: Actor, dt: number): void {
  const last = pet.trail[pet.trail.length - 1];
  if (!last || Math.hypot(actor.x - last.x, actor.y - last.y) >= TRAIL_STEP) {
    pet.trail.push({ x: actor.x, y: actor.y });
    if (pet.trail.length > MAX_TRAIL) pet.trail.shift();
  }
  const target = actor.isMoving ? pointBehind(pet.trail, FOLLOW_GAP) : { x: actor.x + REST_OFFSET.x, y: actor.y + REST_OFFSET.y };
  const dx = target.x - pet.x, dy = target.y - pet.y, distance = Math.hypot(dx, dy);
  if (distance > SNAP_DISTANCE) { pet.x = target.x; pet.y = target.y; pet.moving = false; return; }
  const step = Math.min(distance, SPEED * dt);
  pet.moving = distance > 0.05;
  if (!pet.moving) return;
  pet.x += (dx / distance) * step;
  pet.y += (dy / distance) * step;
  if (Math.abs(dx) > 0.05) pet.facing = dx < 0 ? 'left' : 'right';
}

/** 발자취를 끝에서부터 거슬러 gap(칸)만큼 떨어진 지점 */
function pointBehind(trail: Pet['trail'], gap: number): { x: number; y: number } {
  let left = gap;
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i], b = trail[i - 1];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d >= left) return { x: a.x + ((b.x - a.x) * left) / d, y: a.y + ((b.y - a.y) * left) / d };
    left -= d;
  }
  return trail[0] ?? { x: 0, y: 0 };
}

// ---------- 그리기 ----------
const frameCache = new Map<string, HTMLCanvasElement>();

export function petFrame(kind: PetItem, frame: PetFrame, facing: 'left' | 'right'): HTMLCanvasElement {
  const key = `${kind}|${frame}|${facing}`;
  const cached = frameCache.get(key);
  if (cached) return cached;
  const art = PET_ART[kind];
  const canvas = document.createElement('canvas');
  canvas.width = PET_W;
  canvas.height = PET_H;
  const g = canvas.getContext('2d')!;
  art[frame].forEach((row, y) => [...row].forEach((ch, x) => {
    const color = art.palette[ch];
    if (ch === '.' || !color) return;
    g.fillStyle = color;
    g.fillRect(facing === 'right' ? PET_W - 1 - x : x, y, 1, 1);
  }));
  frameCache.set(key, canvas);
  return canvas;
}

/** 펫을 지도에 그린다. 그리기 순서(깊이)는 펫 발 위치로 정한다 */
export function petDepth(pet: Pet): number { return pet.y * TILE + TILE - 1; }

export function drawPet(g: CanvasRenderingContext2D, pet: Pet, time: number, reduceMotion: boolean): void {
  const walking = pet.moving && !reduceMotion;
  const frame: PetFrame = walking ? (Math.floor(time * WALK_FRAMES_PER_SECOND) % 2 ? 'walk1' : 'walk2') : 'idle';
  const x = Math.round(pet.x * TILE + TILE / 2 - PET_W / 2);
  const y = Math.round(pet.y * TILE + TILE - 2 - (PET_H - 1));
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(x + 3, y + PET_H - 2, PET_W - 6, 2);
  g.drawImage(petFrame(pet.kind, frame, pet.facing), x, y);
}
