// 회사 건물 지도: 바닥·벽·가구 배치, 길찾기, 바닥과 벽 그림(3/4 시점).
// 3/4 시점: 가로 벽은 바로 아래 칸에 벽 앞면(벽지)이 보이고, 벽에 붙은 가구(책장·보드·창문)는 그 앞면에 그린다.
export const TILE = 16;
export const MAP_W = 50;
export const MAP_H = 31;

export interface Spot { x: number; y: number }

/** 화면에 보여 줄 범위(칸). 건물 둘레 잔디만 조금 남기고 잘라 건물이 크게 보이게 한다. */
export const VIEW = { x: 2, y: 2, w: 47, h: 27 } as const;

type Floor = 'grass' | 'dirt' | 'wood' | 'carpet' | 'bluecarpet' | 'metal' | 'checker' | 'stone' | 'meeting' | 'club' | 'door';
type Room = 'dev' | 'library' | 'server' | 'bedroom' | 'kitchen' | 'lobby' | 'meeting' | 'club';

const floor: Floor[][] = Array.from({ length: MAP_H }, () => Array<Floor>(MAP_W).fill('grass'));
const room: Array<Array<Room | null>> = Array.from({ length: MAP_H }, () => Array<Room | null>(MAP_W).fill(null));
const wall: boolean[][] = Array.from({ length: MAP_H }, () => Array<boolean>(MAP_W).fill(false));
const blocked: boolean[][] = Array.from({ length: MAP_H }, () => Array<boolean>(MAP_W).fill(false));

function fill(x0: number, y0: number, x1: number, y1: number, apply: (x: number, y: number) => void): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) apply(x, y);
}
const ROOM_AREAS: Array<[Room, Floor, number, number, number, number]> = [
  ['dev', 'wood', 5, 5, 20, 15], ['library', 'carpet', 22, 5, 28, 15], ['server', 'metal', 30, 5, 35, 15],
  ['bedroom', 'bluecarpet', 5, 17, 17, 24], ['kitchen', 'checker', 19, 17, 27, 24], ['lobby', 'stone', 29, 17, 35, 24],
  ['meeting', 'meeting', 37, 17, 46, 24],
  // 회의실 위 숨은 방(???): 컨텍스트가 80% 넘게 찬 에이전트들이 올라가 춤춘다
  ['club', 'club', 37, 5, 46, 15]
];
ROOM_AREAS.forEach(([r, f, x0, y0, x1, y1]) => fill(x0, y0, x1, y1, (x, y) => { floor[y][x] = f; room[y][x] = r; }));
fill(32, 26, 32, 30, (x, y) => { floor[y][x] = 'dirt'; });
const WALLS: Array<[number, number, number, number]> = [[4, 4, 47, 4], [47, 4, 47, 16], [4, 25, 47, 25], [4, 4, 4, 25], [36, 4, 36, 25], [4, 16, 47, 16], [21, 4, 21, 16], [29, 4, 29, 16], [18, 16, 18, 25], [28, 16, 28, 25], [47, 16, 47, 25]];
WALLS.forEach(([x0, y0, x1, y1]) => fill(x0, y0, x1, y1, (x, y) => { wall[y][x] = true; }));
const DOORS: Array<[number, number]> = [[21, 10], [29, 10], [10, 16], [20, 16], [33, 16], [18, 21], [28, 21], [32, 25], [36, 20], [46, 16]];
DOORS.forEach(([x, y]) => { wall[y][x] = false; floor[y][x] = 'door'; });

/** 방 간판: 첫 줄은 방 이름, 둘째 줄은 그 방에서 하는 일. (x, y)는 간판 아랫변 가운데 */
export const ROOMS = [
  { name: { ko: '개발실\n파일·명령 작업', en: 'Dev room\nFiles & commands' }, x: 12.5, y: 15.4 },
  { name: { ko: '자료실\n웹 검색', en: 'Library\nWeb search' }, x: 25.5, y: 15.4 },
  { name: { ko: '서버실\n백그라운드 실행', en: 'Server room\nBackground jobs' }, x: 33, y: 15.4 },
  { name: { ko: '수면실\n컨텍스트 정리', en: 'Nap room\nCompacting context' }, x: 11.5, y: 24.4 },
  { name: { ko: '탕비실\n지시 기다림', en: 'Pantry\nWaiting for you' }, x: 23.5, y: 24.4 },
  { name: { ko: '로비\nSlack·메일', en: 'Lobby\nSlack & mail' }, x: 32, y: 24.4 },
  { name: { ko: '회의실\n팀 회의', en: 'Meeting room\nTeam meeting' }, x: 41.5, y: 26.2 }, // 아래 줄 팀원 이름표와 겹치지 않게 아래 벽에 건다
  { name: { ko: '???', en: '???' }, x: 38.5, y: 15.4 } // 춤추는 캐릭터 이름표와 겹치지 않게 방 왼쪽 아래 구석에
] as const;

/** 자리는 책상 바로 위 칸. 이 순서대로 앉는데, 앞 번호끼리는 한 책상씩 건너 앉아 이름표·말풍선이 겹치지 않게 했다. */
const DESKS: Spot[] = [{ x: 7, y: 9 }, { x: 15, y: 9 }, { x: 7, y: 14 }, { x: 15, y: 14 }, { x: 11, y: 9 }, { x: 19, y: 9 }, { x: 11, y: 14 }, { x: 19, y: 14 }];
export const SEATS: Spot[] = DESKS.map((d) => ({ x: d.x, y: d.y - 1 }));
export const BEDS: Spot[] = [{ x: 6, y: 18 }, { x: 9, y: 18 }, { x: 12, y: 18 }, { x: 15, y: 18 }];
export const LIBRARY_SPOTS: Spot[] = [{ x: 23, y: 6 }, { x: 25, y: 6 }, { x: 27, y: 6 }, { x: 24, y: 10 }];
export const SERVER_SPOTS: Spot[] = [{ x: 31, y: 7 }, { x: 33, y: 7 }, { x: 35, y: 7 }];
/** 오래 지시를 기다리는 에이전트가 쉬는 탕비실 식탁 주변 (앞 번호끼리 멀리 떨어지게) */
export const LOUNGE_SPOTS: Spot[] = [20, 23, 26, 21, 24, 19, 22, 25].flatMap((x) => [{ x, y: 19 }, { x, y: 22 }]);
export const MAIL_STAND: Spot = { x: 31, y: 23 };
export const COURIER_STAND: Spot = { x: 31, y: 24 };
export const OUTSIDE: Spot = { x: 32, y: 30 };
const MAILBOX: Spot = { x: 30, y: 23 };
/** 회의실: 팀원 자리(앞 번호끼리 띄엄띄엄)와 그 자리에서 바라보는 방향, 그리고 동쪽 끝 CEO 자리 */
export const MEETING_SEATS: Array<Spot & { facing: 'down' | 'up' }> = [
  [39, 18], [41, 18], [43, 18], [39, 22], [41, 22], [43, 22], [40, 18], [42, 18], [44, 18], [40, 22], [42, 22], [44, 22]
].map(([x, y]) => ({ x, y, facing: y === 18 ? 'down' : 'up' }));
export const HEAD_SEAT: Spot = { x: 45, y: 20 };
/** ??? 방 댄스 플로어 위 춤추는 자리 (앞 번호끼리 멀리 떨어지게) */
export const DANCE_SPOTS: Spot[] = [[40, 10], [43, 12], [41, 13], [44, 10], [39, 12], [42, 9], [42, 11], [40, 12], [43, 9], [44, 13]].map(([x, y]) => ({ x, y }));
/** 같은 실패를 반복할 때 헤매는 범위 (개발실 안) */
export const WANDER_AREA = { x0: 5, y0: 6, x1: 20, y1: 15 };

export type FurnitureKind =
  | 'desk' | 'chair' | 'board' | 'tallShelf' | 'shelf' | 'rack' | 'table' | 'stool' | 'counter' | 'fridge'
  | 'crate' | 'plant' | 'tree' | 'bush' | 'mailbox' | 'nightstand' | 'bench' | 'lamppost' | 'cooler'
  | 'meetingTable' | 'officeChair' | 'whiteboard' | 'teamScreen'
  | 'danceFloor' | 'djBooth' | 'speaker' | 'discoBall' | 'clubLights';
export interface Furniture { kind: FurnitureKind; x: number; y: number; depth: number; variant: number }

export const furniture: Furniture[] = [];
function place(kind: FurnitureKind, x: number, y: number, blocks: Array<[number, number]>, depth = (y + 1) * TILE): void {
  furniture.push({ kind, x, y, depth, variant: furniture.length });
  blocks.forEach(([bx, by]) => { blocked[by][bx] = true; });
}
DESKS.forEach((d) => {
  place('chair', d.x, d.y - 1, [], (d.y - 1) * TILE + 6); // 의자는 앉은 캐릭터 뒤
  place('desk', d.x, d.y, [[d.x, d.y], [d.x + 1, d.y]]);
});
place('board', 14, 5, [[14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5]], 5 * TILE);
for (let x = 22; x <= 28; x++) place('tallShelf', x, 5, [[x, 5]]);
for (let x = 23; x <= 27; x++) { place('shelf', x, 9, [[x, 9]]); place('shelf', x, 12, [[x, 12]]); }
[31, 33, 35].forEach((x) => place('rack', x, 5, [[x, 5], [x, 6]], 7 * TILE));
place('table', 21, 20, [[21, 20], [22, 20], [23, 20], [24, 20], [25, 20], [21, 21], [22, 21], [23, 21], [24, 21], [25, 21]], 22 * TILE);
LOUNGE_SPOTS.forEach((s) => place('stool', s.x, s.y, [], s.y * TILE + 4));
place('counter', 22, 17, [[22, 17], [23, 17], [24, 17], [25, 17]]);
place('fridge', 26, 17, [[26, 17]]);
[7, 10, 13].forEach((x) => place('nightstand', x, 18, [[x, 18]]));
([[34, 22], [35, 22], [35, 23]] as const).forEach(([x, y]) => place('crate', x, y, [[x, y]]));
place('bench', 33, 18, [[33, 18], [34, 18]]);
place('plant', 30, 18, [[30, 18]]);
place('plant', 19, 23, [[19, 23]]);
place('plant', 5, 6, [[5, 6]]);
place('plant', 20, 6, [[20, 6]]);
place('cooler', 5, 12, [[5, 12]]);
place('mailbox', MAILBOX.x, MAILBOX.y, [[MAILBOX.x, MAILBOX.y]]);
place('lamppost', 33, 27, [[33, 27]]);
place('meetingTable', 39, 19, [39, 40, 41, 42, 43, 44].flatMap((x) => [[x, 19], [x, 20], [x, 21]] as Array<[number, number]>), 22 * TILE);
MEETING_SEATS.forEach((s) => place('officeChair', s.x, s.y, [], s.y * TILE + (s.facing === 'down' ? 4 : 18)));
place('officeChair', HEAD_SEAT.x, HEAD_SEAT.y, [], HEAD_SEAT.y * TILE + 4);
place('whiteboard', 38, 17, [], 17 * TILE);
place('teamScreen', 42, 17, [], 17 * TILE);
place('plant', 37, 24, [[37, 24]]);
place('plant', 46, 24, [[46, 24]]);
// ??? 방: 바닥에 깔리는 댄스 플로어는 맨 먼저, 천장의 미러볼과 조명은 캐릭터보다 나중에 그린다
place('danceFloor', 39, 9, [], 0);
place('djBooth', 40, 6, [40, 41, 42, 43].map((x) => [x, 6] as [number, number]), 7 * TILE);
place('speaker', 37, 5, [[37, 5], [37, 6]], 7 * TILE);
place('speaker', 46, 5, [[46, 5], [46, 6]], 7 * TILE);
place('clubLights', 37, 5, [], MAP_H * TILE + 1);
place('discoBall', 41, 8, [], MAP_H * TILE + 2);
([[1, 2], [2, 9], [1, 15], [2, 22], [1, 28], [7, 28], [14, 29], [22, 28], [27, 29], [39, 2], [44, 2], [48, 9], [48, 14], [49, 19], [49, 23], [40, 27], [44, 28], [48, 27], [12, 1], [26, 1], [34, 1]] as const)
  .forEach(([x, y]) => place('tree', x, y, [[x, y]]));
([[6, 27], [17, 27], [38, 27], [3, 5], [24, 2], [8, 2], [48, 5], [48, 26]] as const).forEach(([x, y]) => place('bush', x, y, [[x, y]]));

/** 창문 위치 (벽 앞면에 그린다). 바깥 하늘이 보이는 곳만 */
export const WINDOWS: Spot[] = [{ x: 6, y: 5 }, { x: 10, y: 5 }, { x: 31, y: 17 }, { x: 6, y: 17 }, { x: 14, y: 17 }, { x: 45, y: 17 }];

/** 밤에 켜지는 불빛 (픽셀 좌표 중심, 반지름, 색) */
export const LIGHTS: Array<{ x: number; y: number; r: number; color: string }> = [
  ...[7, 10, 13].map((x) => ({ x: x * TILE + 8, y: 18 * TILE + 2, r: 34, color: '255,200,120' })),
  { x: 23.5 * TILE, y: 20.5 * TILE, r: 70, color: '255,226,170' },
  { x: 32 * TILE, y: 20 * TILE, r: 64, color: '255,226,170' },
  { x: 33 * TILE + 8, y: 26 * TILE, r: 60, color: '255,214,140' },
  { x: 25.5 * TILE, y: 10 * TILE, r: 64, color: '255,220,160' },
  { x: 33 * TILE, y: 6 * TILE, r: 46, color: '120,255,190' },
  { x: 41.5 * TILE, y: 20 * TILE, r: 90, color: '255,236,190' },
  { x: 40 * TILE, y: 11 * TILE, r: 70, color: '255,90,200' },
  { x: 44 * TILE, y: 11 * TILE, r: 70, color: '90,200,255' }
];

export const isWalkable = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && !wall[y][x] && !blocked[y][x];

/** 4방향 너비 우선 탐색. 시작 칸은 빼고 도착 칸까지의 칸 목록. 못 가면 빈 배열. */
export function findPath(from: Spot, to: Spot): Spot[] {
  const sx = Math.round(from.x), sy = Math.round(from.y);
  if (sx === to.x && sy === to.y) return [];
  const prev = new Int32Array(MAP_W * MAP_H).fill(-1);
  const start = sy * MAP_W + sx, goal = to.y * MAP_W + to.x;
  prev[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length && prev[goal] === -1; head++) {
    const cur = queue[head];
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const next = ny * MAP_W + nx;
      if (prev[next] !== -1 || (next !== goal && !isWalkable(nx, ny))) continue;
      prev[next] = cur;
      queue.push(next);
    }
  }
  if (prev[goal] === -1) return [];
  const path: Spot[] = [];
  for (let c = goal; c !== start; c = prev[c]) path.push({ x: c % MAP_W, y: (c / MAP_W) | 0 });
  return path.reverse();
}

// ---------- 바닥·벽 그림 (한 번만 그려 둔다) ----------
const WALLPAPER: Record<Room, { base: string; accent: string }> = {
  dev: { base: '#e6d3ae', accent: '#d9c39a' },
  library: { base: '#c9d6bf', accent: '#b6c7aa' },
  server: { base: '#a3adb9', accent: '#939eab' },
  bedroom: { base: '#c9d4ec', accent: '#b6c3e2' },
  kitchen: { base: '#f1e4c6', accent: '#e4d2ab' },
  lobby: { base: '#c4c7cd', accent: '#b3b6bd' },
  meeting: { base: '#d9cfe4', accent: '#c9bdd8' },
  club: { base: '#2c2142', accent: '#3a2b58' }
};
export const FACE_HEIGHT = 12; // 벽 앞면이 아래 칸으로 내려오는 높이(px)

export function paintFloor(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_W * TILE; canvas.height = MAP_H * TILE;
  const g = canvas.getContext('2d')!;
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rect = (x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.fillRect(x, y, w, h); };

  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) paintTile(x, y);
  // 큰 러그는 바닥 위에 한 번에
  rug(8 * TILE, 10 * TILE + 4, 7 * TILE, 3 * TILE, '#8a5a4a', '#a5705c');
  rug(23 * TILE, 13 * TILE + 4, 5 * TILE, 2 * TILE - 4, '#5b6e4a', '#73885d');
  rug(6 * TILE, 21 * TILE, 10 * TILE, 3 * TILE, '#4c6aa0', '#6585bd');
  rug(31 * TILE + 4, 24 * TILE + 2, 2 * TILE, TILE - 4, '#8a4a3a', '#a85f4a');
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (wall[y][x]) paintWall(x, y);
  return canvas;

  function rug(x: number, y: number, w: number, h: number, edge: string, body: string): void {
    rect(x, y, w, h, edge); rect(x + 3, y + 3, w - 6, h - 6, body);
    for (let i = x + 6; i < x + w - 6; i += 6) rect(i, y + 1, 2, 1, body);
  }

  function paintTile(x: number, y: number): void {
    const X = x * TILE, Y = y * TILE;
    switch (floor[y][x]) {
      case 'grass':
        rect(X, Y, TILE, TILE, '#5a8f3c');
        for (let k = 0; k < 8; k++) rect(X + ((random() * 16) | 0), Y + ((random() * 16) | 0), 1, 2, random() > 0.5 ? '#6aa348' : '#4c7d32');
        if (random() > 0.9) { const c = ['#f2d65a', '#f29ab8', '#ffffff', '#b9a6f2'][(random() * 4) | 0]; rect(X + 6, Y + 6, 2, 2, c); rect(X + 7, Y + 8, 1, 2, '#3f7230'); }
        return;
      case 'dirt':
        rect(X, Y, TILE, TILE, '#a37e4f');
        for (let k = 0; k < 6; k++) rect(X + ((random() * 15) | 0), Y + ((random() * 15) | 0), 2, 1, '#8c6a40');
        return;
      case 'wood': {
        rect(X, Y, TILE, TILE, '#a8794b');
        for (let r = 0; r < 4; r++) {
          rect(X, Y + r * 4 + 3, TILE, 1, '#8e6339');
          rect(X + ((x * 7 + y * 3 + r * 5) % 16), Y + r * 4, 1, 3, '#8e6339');
        }
        rect(X, Y, TILE, 1, '#b8885a');
        return;
      }
      case 'carpet':
        rect(X, Y, TILE, TILE, '#7a3a3c');
        if ((x + y) % 2 === 0) { rect(X + 6, Y + 6, 4, 4, '#8c4547'); rect(X + 7, Y + 7, 2, 2, '#a3585a'); }
        return;
      case 'bluecarpet':
        rect(X, Y, TILE, TILE, '#3b5a85');
        if ((x * 3 + y) % 4 === 0) rect(X + 5, Y + 9, 2, 2, '#4a6a98');
        return;
      case 'metal':
        rect(X, Y, TILE, TILE, '#7e8792'); rect(X, Y, TILE, 1, '#929ba6'); rect(X, Y, 1, TILE, '#929ba6'); rect(X + 15, Y, 1, TILE, '#6b7480'); rect(X, Y + 15, TILE, 1, '#6b7480');
        if ((x + y) % 3 === 0) for (let i = 0; i < 4; i++) rect(X + 4, Y + 4 + i * 2, 8, 1, '#5f6873');
        return;
      case 'checker':
        rect(X, Y, TILE, TILE, '#eadfc6'); rect(X, Y, 8, 8, '#d6c7a6'); rect(X + 8, Y + 8, 8, 8, '#d6c7a6');
        return;
      case 'meeting':
        rect(X, Y, TILE, TILE, '#6c6278'); if ((x + y) % 2 === 0) rect(X + 7, Y + 7, 2, 2, '#786d86');
        return;
      case 'club':
        // 어두운 바닥 타일, 이음매만 살짝 보이게
        rect(X, Y, TILE, TILE, '#1c1726'); rect(X, Y, TILE, 1, '#251e33'); rect(X, Y, 1, TILE, '#251e33');
        return;
      case 'stone':
        rect(X, Y, TILE, TILE, '#9aa0a8'); rect(X + 1, Y + 1, 14, 14, '#a8aeb6'); rect(X + 1, Y + 1, 14, 1, '#b8bec6');
        return;
      case 'door': {
        const outside = y === 25;
        rect(X, Y, TILE, TILE, outside ? '#9aa0a8' : '#a8794b');
        rect(X + 2, Y, 12, TILE, '#8a5a32'); rect(X + 3, Y, 10, TILE, '#a06c3e');
        rect(X + 3, Y + 7, 10, 1, '#8a5a32');
        return;
      }
    }
  }

  function paintWall(x: number, y: number): void {
    const X = x * TILE, Y = y * TILE;
    // 벽 윗면
    rect(X, Y, TILE, TILE, '#4b403b'); rect(X, Y, TILE, 3, '#6b5d55'); rect(X, Y + 3, TILE, 1, '#5b4e47');
    const below = y + 1 < MAP_H ? room[y + 1][x] : null;
    const belowIsWall = y + 1 < MAP_H && wall[y + 1][x];
    if (belowIsWall || floor[y + 1]?.[x] === 'door') return;
    const FY = Y + TILE;
    if (below) {
      // 실내 벽 앞면: 방마다 다른 벽지 + 걸레받이
      const paper = WALLPAPER[below];
      rect(X, FY, TILE, FACE_HEIGHT, paper.base);
      for (let i = 2; i < TILE; i += 5) rect(X + i, FY, 1, FACE_HEIGHT - 3, paper.accent);
      rect(X, FY + FACE_HEIGHT - 3, TILE, 3, '#7a5a3a');
      rect(X, FY, TILE, 1, 'rgba(0,0,0,0.25)');
    } else {
      // 건물 바깥 벽: 벽돌
      rect(X, FY, TILE, FACE_HEIGHT, '#a0684e');
      for (let r = 0; r < 3; r++) {
        rect(X, FY + r * 4 + 3, TILE, 1, '#7d4f3a');
        rect(X + ((r % 2) * 8 + 4), FY + r * 4, 1, 3, '#7d4f3a');
      }
      rect(X, FY + FACE_HEIGHT, TILE, 2, 'rgba(0,0,0,0.25)');
    }
  }
}
