// 가구 그림 (16px 타일, 3/4 시점). 위치는 map.ts가 정하고, 여기서는 생김새만 그린다.
import { drawClubFurniture } from './clubArt.ts';
import { TILE, type Furniture } from './map.ts';

export interface BoardCard { color: string; status: 'pending' | 'in_progress' | 'completed' }

export interface FurnitureContext {
  time: number;
  reduceMotion: boolean;
  /** 서버실에서 백그라운드 작업이 돌고 있으면 불빛이 빨라진다 */
  serverBusy: boolean;
  mailboxHasItem: boolean;
  boardCards: BoardCard[];
  /** 밤이면 스탠드·가로등 갓이 밝게 빛난다 */
  night: boolean;
  /** 회의실 모니터에 띄울 팀 할 일 진행 (팀이 없으면 null) */
  teamProgress: { done: number; total: number } | null;
}

const BOOK_COLORS = ['#c9503f', '#e6b450', '#4a78d8', '#5fb27e', '#9a6ad0', '#efe9dc', '#d9773f'];
const MUG_COLORS = ['#e2654f', '#f4f0e6', '#5b8de8', '#7cc68a'];
const BOARD_COLUMNS: Array<BoardCard['status']> = ['pending', 'in_progress', 'completed'];
const BOARD_HEADER_COLORS = ['#9aa3ad', '#e6b450', '#7cc68a'];
const CARDS_PER_COLUMN = 8;

type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

export function drawFurniture(g: CanvasRenderingContext2D, f: Furniture, ctx: FurnitureContext): void {
  const X = f.x * TILE, Y = f.y * TILE;
  const r: Rect = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  const pulse = (period: number, offset = 0) => !ctx.reduceMotion && Math.floor(ctx.time * period + offset) % 2 === 0;
  const shadow = (x: number, y: number, w: number) => r(x, y, w, 3, 'rgba(0,0,0,0.22)');

  switch (f.kind) {
    case 'desk': {
      shadow(X + 1, Y + 15, 30);
      r(X, Y + 1, 32, 9, '#b98a58'); r(X, Y + 1, 32, 1, '#d1a46f'); r(X, Y + 10, 32, 5, '#8a5f38');
      r(X + 1, Y + 15, 2, 1, '#5e3d22'); r(X + 29, Y + 15, 2, 1, '#5e3d22');
      // 노트북 뒷면 (앉은 사람을 향해 열려 있다)
      r(X + 8, Y - 5, 14, 11, '#3a3f4a'); r(X + 9, Y - 4, 12, 9, '#545b68'); r(X + 14, Y - 1, 2, 2, '#c9ccd2');
      r(X + 7, Y + 5, 16, 2, '#2a2e36');
      if (pulse(1.5, f.variant)) r(X + 8, Y + 4, 1, 1, '#9ff0d0');
      // 책상 위 소품: 서류, 머그잔 (책상마다 조금씩 다르게)
      r(X + 2, Y + 3, 5, 4, '#f4f0e6'); r(X + 3, Y + 4, 3, 1, '#b9b3a6');
      const mug = MUG_COLORS[f.variant % MUG_COLORS.length];
      r(X + 25, Y + 2, 4, 5, mug); r(X + 29, Y + 3, 1, 2, mug); r(X + 25, Y + 2, 4, 1, '#6b4226');
      return;
    }
    case 'chair':
      r(X + 3, Y - 4, 10, 9, '#3b4a63'); r(X + 4, Y - 3, 8, 7, '#4b5d7c'); r(X + 3, Y + 5, 10, 3, '#2e3a4f');
      return;
    case 'board': {
      r(X + 2, Y - 13, 92, 23, '#6a4a2e'); r(X + 4, Y - 11, 88, 19, '#c9a06a');
      for (let i = 0; i < 18; i++) r(X + 6 + ((i * 37) % 84), Y - 9 + ((i * 13) % 16), 1, 1, '#b48a58');
      BOARD_COLUMNS.forEach((status, col) => {
        const cx0 = X + 6 + col * 29;
        r(cx0, Y - 10, 26, 2, BOARD_HEADER_COLORS[col]);
        ctx.boardCards.filter((c) => c.status === status).slice(0, CARDS_PER_COLUMN).forEach((card, k) => {
          const cx = cx0 + (k % 2) * 13, cy = Y - 6 + Math.floor(k / 2) * 4;
          r(cx, cy, 11, 3, status === 'completed' ? card.color : '#f6f1e4');
          if (status === 'in_progress') r(cx, cy, pulse(2) ? 11 : 6, 3, card.color);
          if (status === 'pending') r(cx, cy, 11, 1, card.color);
        });
      });
      return;
    }
    case 'tallShelf':
      r(X, Y - 14, 16, 29, '#5a3a22'); r(X + 1, Y - 13, 14, 27, '#3e2716');
      for (let shelf = 0; shelf < 3; shelf++) {
        const sy = Y - 12 + shelf * 9;
        for (let k = 0; k < 6; k++) {
          const h = 6 + ((k + shelf + f.x) % 3);
          r(X + 2 + k * 2, sy + (8 - h), 2, h, BOOK_COLORS[(k * 3 + shelf + f.x) % BOOK_COLORS.length]);
        }
        r(X + 1, sy + 8, 14, 1, '#6e4a2e');
      }
      shadow(X, Y + 15, 16);
      return;
    case 'shelf':
      shadow(X, Y + 14, 16);
      r(X, Y - 8, 16, 22, '#5a3a22'); r(X + 1, Y - 8, 14, 3, '#7a5236'); r(X + 1, Y - 5, 14, 18, '#3e2716');
      for (let shelf = 0; shelf < 2; shelf++) {
        const sy = Y - 4 + shelf * 9;
        for (let k = 0; k < 6; k++) r(X + 2 + k * 2, sy + 1 + ((k + f.x) % 2), 2, 7 - ((k + f.x) % 2), BOOK_COLORS[(k + shelf * 2 + f.x) % BOOK_COLORS.length]);
        r(X + 1, sy + 8, 14, 1, '#6e4a2e');
      }
      return;
    case 'rack':
      r(X + 1, Y - 14, 14, 44, '#1d2026'); r(X + 2, Y - 13, 12, 42, '#2a2f37');
      for (let row = 0; row < 9; row++) {
        const ry = Y - 11 + row * 4;
        r(X + 3, ry, 7, 2, '#3a404a');
        const on = ctx.serverBusy ? pulse(8, row + f.x) : Math.floor(ctx.time * 0.8 + row) % 4 === 0;
        r(X + 11, ry, 2, 2, on ? (ctx.serverBusy ? '#ffcf5a' : '#5fe0a0') : '#22442f');
      }
      shadow(X + 1, Y + 30, 14);
      return;
    case 'table':
      shadow(X + 2, Y + 30, 76);
      r(X, Y + 2, 80, 22, '#a87446'); r(X, Y + 2, 80, 2, '#c08a58'); r(X, Y + 24, 80, 6, '#7e5430');
      r(X + 4, Y + 6, 72, 14, '#f2ead8'); r(X + 4, Y + 12, 72, 2, '#e2654f');
      [10, 34, 58].forEach((o) => { r(X + o, Y + 7, 8, 5, '#ffffff'); r(X + o + 2, Y + 8, 4, 2, '#e6b450'); });
      r(X + 38, Y + 15, 6, 4, '#7a4a2a'); r(X + 39, Y + 14, 2, 2, '#e2454f'); r(X + 42, Y + 14, 2, 2, '#7cc68a');
      return;
    case 'stool':
      r(X + 4, Y + 9, 8, 3, '#8a5a32'); r(X + 5, Y + 8, 6, 1, '#a87446'); r(X + 7, Y + 12, 2, 3, '#5e3d22');
      return;
    case 'counter': {
      r(X, Y - 4, 64, 6, '#d8d0c0'); r(X, Y - 4, 64, 1, '#f0ebe0'); r(X, Y + 2, 64, 13, '#8a6a4a');
      for (let d = 0; d < 4; d++) { r(X + d * 16 + 2, Y + 4, 12, 9, '#9c7a56'); r(X + d * 16 + 7, Y + 8, 2, 1, '#e6d6b0'); }
      // 커피머신
      r(X + 2, Y - 16, 11, 13, '#c94f3d'); r(X + 3, Y - 15, 9, 4, '#2b3440'); r(X + 5, Y - 6, 5, 3, '#f4f0e6');
      if (pulse(1.2)) { r(X + 6, Y - 20, 1, 2, 'rgba(255,255,255,0.7)'); r(X + 8, Y - 22, 1, 2, 'rgba(255,255,255,0.5)'); }
      // 개수대
      r(X + 34, Y - 3, 12, 4, '#9aa3ad'); r(X + 39, Y - 9, 2, 6, '#c9ccd2');
      // 주전자
      r(X + 52, Y - 9, 7, 6, '#4a78d8'); r(X + 54, Y - 10, 3, 1, '#2a4fa8');
      return;
    }
    case 'fridge':
      r(X + 1, Y - 18, 14, 33, '#e9eef2'); r(X + 1, Y - 18, 14, 1, '#ffffff'); r(X + 1, Y - 4, 14, 1, '#b8c2cc');
      r(X + 12, Y - 14, 1, 7, '#8a96a3'); r(X + 12, Y, 1, 8, '#8a96a3'); r(X + 3, Y - 15, 4, 3, '#e2654f');
      shadow(X + 1, Y + 15, 14);
      return;
    case 'nightstand':
      r(X + 3, Y + 4, 10, 10, '#7a5236'); r(X + 3, Y + 4, 10, 1, '#9a6c46'); r(X + 7, Y + 8, 2, 1, '#e6c78a');
      r(X + 7, Y - 1, 2, 5, '#3b2a2a');
      r(X + 4, Y - 6, 8, 5, ctx.night ? '#ffe7a8' : '#f2dcb0'); r(X + 5, Y - 7, 6, 1, ctx.night ? '#fff3cf' : '#e8cc98');
      return;
    case 'bench':
      shadow(X + 1, Y + 13, 30);
      r(X + 1, Y + 4, 30, 3, '#a87446'); r(X + 1, Y + 8, 30, 3, '#a87446'); r(X + 1, Y + 7, 30, 1, '#7e5430');
      r(X + 3, Y + 11, 2, 3, '#5e3d22'); r(X + 27, Y + 11, 2, 3, '#5e3d22');
      return;
    case 'crate':
      shadow(X, Y + 14, 16);
      r(X + 1, Y + 1, 14, 14, '#8a6438'); r(X + 2, Y + 2, 12, 12, '#a87e4a');
      r(X + 2, Y + 7, 12, 1, '#8a6438'); r(X + 7, Y + 2, 1, 12, '#8a6438'); r(X + 2, Y + 2, 12, 1, '#c09460');
      return;
    case 'plant':
      shadow(X + 3, Y + 14, 10);
      r(X + 4, Y + 8, 8, 7, '#b0603a'); r(X + 4, Y + 8, 8, 2, '#c97448');
      r(X + 2, Y - 4, 12, 12, '#4f9a52'); r(X + 4, Y - 7, 8, 5, '#5fb262'); r(X + 1, Y, 3, 4, '#3f8442'); r(X + 12, Y - 1, 3, 5, '#3f8442');
      r(X + 6, Y - 3, 2, 2, '#7ccc7e');
      return;
    case 'cooler':
      shadow(X + 3, Y + 14, 10);
      r(X + 3, Y + 2, 10, 12, '#e9eef2'); r(X + 4, Y - 8, 8, 10, '#8fc3ec'); r(X + 5, Y - 7, 3, 7, '#bfe0f8'); r(X + 6, Y + 6, 4, 2, '#4a78d8');
      return;
    case 'mailbox':
      r(X + 7, Y + 4, 2, 11, '#5a3a22');
      r(X + 2, Y - 4, 12, 9, '#c98a2c'); r(X + 2, Y - 4, 12, 2, '#e6b450'); r(X + 4, Y - 1, 8, 1, '#5a3a22');
      if (ctx.mailboxHasItem) {
        r(X + 13, Y - 10, 1, 8, '#3b2a2a'); r(X + 13, Y - 10, 4, 3, '#e2454f');
        r(X + 5, Y - (pulse(3) ? 8 : 7), 6, 3, '#f4f0e6');
      }
      return;
    case 'lamppost':
      r(X + 7, Y - 18, 2, 32, '#3b3f48'); r(X + 4, Y - 23, 8, 6, '#2b2f38');
      r(X + 5, Y - 22, 6, 4, ctx.night ? '#ffe7a8' : '#cfd6dc');
      r(X + 5, Y + 13, 6, 2, '#2b2f38');
      return;
    case 'meetingTable': {
      shadow(X + 2, Y + 46, 92);
      r(X, Y + 2, 96, 40, '#7a5236'); r(X, Y + 2, 96, 2, '#9a6c46'); r(X + 2, Y + 4, 92, 36, '#8c603e');
      r(X, Y + 42, 96, 5, '#5e3d22');
      // 자리마다 노트북과 서류
      [0, 2, 4, 1, 3, 5].forEach((i) => {
        const lx = X + 4 + i * 16;
        r(lx, Y + 6, 9, 6, '#3a3f4a'); r(lx + 1, Y + 7, 7, 4, '#9ff0d0');
        r(lx + 2, Y + 30, 9, 6, '#3a3f4a'); r(lx + 3, Y + 31, 7, 4, pulse(1.2, i) ? '#9ff0d0' : '#7fd8b4');
      });
      r(X + 40, Y + 18, 16, 8, '#f4f0e6'); r(X + 42, Y + 20, 5, 4, '#e2654f'); r(X + 49, Y + 20, 5, 4, '#e6b450');
      return;
    }
    case 'officeChair':
      r(X + 3, Y + 4, 10, 8, '#3a3550'); r(X + 4, Y + 5, 8, 6, '#4b456a'); r(X + 7, Y + 12, 2, 3, '#2b2b30');
      return;
    case 'whiteboard':
      r(X + 1, Y + 1, 46, 11, '#c9ccd2'); r(X + 2, Y + 2, 44, 9, '#fbfbfd');
      r(X + 5, Y + 4, 14, 1, '#5b8de8'); r(X + 5, Y + 7, 10, 1, '#e2654f'); r(X + 22, Y + 4, 2, 5, '#2f9a6d'); r(X + 26, Y + 5, 12, 1, '#2a2232'); r(X + 26, Y + 8, 8, 1, '#2a2232');
      return;
    case 'teamScreen': {
      r(X, Y, 32, 12, '#1d2026'); r(X + 1, Y + 1, 30, 9, '#123048');
      const progress = ctx.teamProgress;
      if (progress && progress.total > 0) {
        const w = Math.round((26 * progress.done) / progress.total);
        r(X + 3, Y + 6, 26, 2, '#2a4a62'); r(X + 3, Y + 6, w, 2, '#7cc68a');
        for (let i = 0; i < Math.min(progress.total, 8); i++) r(X + 3 + i * 3, Y + 3, 2, 2, i < progress.done ? '#7cc68a' : '#5b8de8');
      } else {
        r(X + 3, Y + 4, 6, 2, pulse(1) ? '#5b8de8' : '#2a4a62');
      }
      r(X + 14, Y + 12, 4, 2, '#2b2b30');
      return;
    }
    case 'tree':
      r(X - 2, Y + 11, 20, 5, 'rgba(0,0,0,0.22)'); r(X + 6, Y + 2, 4, 13, '#6b4426');
      blob(r, X + 8, Y - 6, 12, 10, '#3f7230', '#4f8a3a', '#5fa046');
      return;
    case 'danceFloor': case 'djBooth': case 'speaker': case 'discoBall': case 'clubLights':
      drawClubFurniture(g, f, ctx);
      return;
    case 'bush':
      r(X + 1, Y + 11, 14, 4, 'rgba(0,0,0,0.2)');
      blob(r, X + 8, Y + 6, 7, 6, '#3f7a32', '#4f9440', '#61a84e');
      r(X + 4, Y + 5, 2, 2, '#e2454f'); r(X + 10, Y + 3, 2, 2, '#e2454f');
      return;
  }
}

/** 둥근 덩어리(나무 잎·덤불): 어두운 바탕 위에 위쪽·왼쪽만 밝게 */
function blob(r: Rect, cx: number, cy: number, rx: number, ry: number, dark: string, mid: string, light: string): void {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (d > 1) continue;
    const lit = x / rx + y / ry < -0.5;
    r(cx + x, cy + y, 1, 1, d > 0.8 ? dark : lit ? light : mid);
  }
}

/** 침대: 이불 색은 그 침대를 쓰는 에이전트 옷 색 */
export function drawBed(g: CanvasRenderingContext2D, x: number, y: number, blanket: string, blanketLight: string): void {
  const X = x * TILE, Y = y * TILE;
  const r: Rect = (rx, ry, w, h, color) => { g.fillStyle = color; g.fillRect(rx, ry, w, h); };
  r(X, Y + 30, 16, 3, 'rgba(0,0,0,0.22)');
  r(X, Y - 5, 16, 8, '#6a4528'); r(X + 1, Y - 4, 14, 2, '#8a5d38');
  r(X + 1, Y + 2, 14, 28, '#f4f0e6');
  r(X + 2, Y + 3, 12, 7, '#ffffff'); r(X + 2, Y + 9, 12, 1, '#dcd6ca');
  r(X + 1, Y + 12, 14, 18, blanket); r(X + 1, Y + 12, 14, 2, blanketLight);
  r(X + 1, Y + 29, 14, 2, '#6a4528');
}

/** 벽 앞면의 창문. 하늘색은 시각에 따라 바뀐다. */
export function drawWindow(g: CanvasRenderingContext2D, x: number, y: number, sky: string, night: boolean): void {
  const X = x * TILE, Y = y * TILE;
  const r: Rect = (rx, ry, w, h, color) => { g.fillStyle = color; g.fillRect(rx, ry, w, h); };
  r(X + 1, Y, 14, 10, '#6a4a2e'); r(X + 2, Y + 1, 12, 8, sky);
  if (night) { r(X + 4, Y + 3, 1, 1, '#ffffff'); r(X + 10, Y + 2, 1, 1, '#fff3c0'); }
  else { r(X + 3, Y + 2, 4, 1, 'rgba(255,255,255,0.6)'); }
  r(X + 7, Y + 1, 2, 8, '#6a4a2e'); r(X + 2, Y + 4, 12, 1, '#6a4a2e');
  r(X, Y + 9, 16, 2, '#8a6a4a');
}
