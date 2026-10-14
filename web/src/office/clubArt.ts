// ??? 방(숨은 클럽) 가구: 색이 바뀌는 댄스 플로어, DJ 부스, 스피커, 천장 미러볼, 방을 훑는 색 조명.
// 모두 시간(ctx.time)에 따라 움직이고, 움직임 줄이기 설정이면 멈춘 한 장면만 그린다.
import { TILE, type Furniture } from './map.ts';
import type { FurnitureContext } from './furnitureArt.ts';

const NEON = ['#ff4fa3', '#4fd6ff', '#ffe14f', '#8a6bff', '#4fff9e'];
/** 댄스 플로어 크기(칸) */
const FLOOR_W = 6, FLOOR_H = 5;
/** 조명이 닿는 방 범위(칸) */
const ROOM = { x0: 37, y0: 5, x1: 46, y1: 15 };
const BEATS_PER_SECOND = 2;

export function drawClubFurniture(g: CanvasRenderingContext2D, f: Furniture, ctx: FurnitureContext): void {
  const X = f.x * TILE, Y = f.y * TILE;
  const t = ctx.reduceMotion ? 0 : ctx.time;
  const beat = Math.floor(t * BEATS_PER_SECOND);
  const r = (x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.fillRect(x, y, w, h); };

  switch (f.kind) {
    case 'danceFloor':
      // 칸마다 박자에 맞춰 색이 넘어간다. 대각선으로 물결치듯
      for (let ty = 0; ty < FLOOR_H; ty++) for (let tx = 0; tx < FLOOR_W; tx++) {
        const color = NEON[(tx + ty + beat) % NEON.length];
        const lit = (tx * 3 + ty * 5 + beat) % 3 !== 0;
        const x = X + tx * TILE, y = Y + ty * TILE;
        r(x, y, TILE, TILE, '#120e1a');
        g.globalAlpha = lit ? 0.85 : 0.3;
        r(x + 1, y + 1, TILE - 2, TILE - 2, color);
        g.globalAlpha = lit ? 0.5 : 0.15;
        r(x + 2, y + 2, TILE - 4, 2, '#ffffff');
        g.globalAlpha = 1;
      }
      return;
    case 'djBooth': {
      const w = 4 * TILE;
      r(X, Y - 4, w, 14, '#2a2438'); r(X, Y - 4, w, 2, '#4a4060'); r(X, Y + 10, w, 3, '#17121f');
      // 턴테이블 두 개
      for (const cx of [X + 12, X + w - 12]) {
        r(cx - 6, Y - 2, 12, 6, '#0d0b12'); r(cx - 4, Y - 1, 8, 4, '#3a3448');
        r(cx - 1 + (beat % 2), Y, 2, 2, '#ff4fa3');
      }
      // 가운데 이퀄라이저 막대
      for (let i = 0; i < 8; i++) {
        const h = 2 + ((i * 7 + beat * 3) % 6);
        r(X + 22 + i * 2, Y + 8 - h, 1, h, NEON[i % NEON.length]);
      }
      return;
    }
    case 'speaker': {
      r(X + 1, Y - 10, 14, 34, '#17131e'); r(X + 2, Y - 9, 12, 32, '#262031');
      const pump = beat % 2 === 0 ? 1 : 0;
      for (const [cy, rad] of [[Y - 3, 4], [Y + 12, 5]] as const) {
        ring(g, X + 8, cy, rad + pump, '#4a4458'); ring(g, X + 8, cy, rad - 2, '#0d0b12');
      }
      return;
    }
    case 'clubLights': {
      const left = ROOM.x0 * TILE, top = ROOM.y0 * TILE, w = (ROOM.x1 - ROOM.x0 + 1) * TILE, h = (ROOM.y1 - ROOM.y0 + 1) * TILE;
      g.save();
      g.beginPath(); g.rect(left, top, w, h); g.clip();
      // 방 전체를 어둡게 한 뒤, 색 조명 세 개가 플로어를 훑고 지나간다
      g.fillStyle = 'rgba(10, 4, 24, 0.38)'; g.fillRect(left, top, w, h);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * (0.7 + i * 0.25) + i * 2.1;
        const cx = (41.5 + Math.cos(a) * 3.2) * TILE, cy = (11.5 + Math.sin(a * 1.3) * 2.2) * TILE;
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, 30);
        const rgb = ['255,80,180', '80,210,255', '255,230,90'][i];
        glow.addColorStop(0, `rgba(${rgb},0.55)`); glow.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = glow; g.fillRect(cx - 30, cy - 30, 60, 60);
        // 미러볼에서 떨어지는 빛줄기
        g.fillStyle = `rgba(${rgb},0.10)`;
        g.beginPath(); g.moveTo(42 * TILE, 8 * TILE); g.lineTo(cx - 14, cy); g.lineTo(cx + 14, cy); g.closePath(); g.fill();
      }
      g.restore();
      return;
    }
    case 'discoBall': {
      const cx = X + TILE, cy = Y;
      r(cx, (ROOM.y0 - 1) * TILE + 12, 1, cy - 7 - ((ROOM.y0 - 1) * TILE + 12), '#8a8494'); // 천장에서 내려온 줄
      // 거울 조각: 박자마다 반짝이는 칸이 돌아간다
      for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
        if (x * x + y * y > 49) continue;
        const edge = x * x + y * y > 36;
        const facet = ((x + 8) >> 1) + ((y + 8) >> 1) + beat;
        const color = edge ? '#5d5868' : facet % 4 === 0 ? '#ffffff' : facet % 4 === 1 ? '#c9c6d4' : facet % 4 === 2 ? '#9a96a8' : '#e6e2f0';
        r(cx + x, cy + y, 1, 1, color);
      }
      // 주변에 튀는 반짝임
      for (let i = 0; i < 4; i++) {
        const a = t * 1.5 + (i * Math.PI) / 2;
        const sx = Math.round(cx + Math.cos(a) * 13), sy = Math.round(cy + Math.sin(a) * 8);
        r(sx, sy - 1, 1, 3, '#ffffff'); r(sx - 1, sy, 3, 1, '#ffffff');
      }
      return;
    }
  }
}

function ring(g: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string): void {
  g.fillStyle = color;
  for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) if (x * x + y * y <= radius * radius) g.fillRect(cx + x, cy + y, 1, 1);
}
