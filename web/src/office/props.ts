// 캐릭터 머리 위에 뜨는 것들: 상태 아이콘, 들고 다니는 상자·편지.

export function drawParcel(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#221a26'; g.fillRect(x, y, 14, 10);
  g.fillStyle = '#c49a5c'; g.fillRect(x + 1, y + 1, 12, 8);
  g.fillStyle = '#e8d2a6'; g.fillRect(x + 1, y + 1, 12, 2);
  g.fillStyle = '#e2454f'; g.fillRect(x + 6, y + 1, 2, 8);
}

export function drawLetter(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#221a26'; g.fillRect(x, y, 14, 10);
  g.fillStyle = '#fffaf0'; g.fillRect(x + 1, y + 1, 12, 8);
  g.fillStyle = '#d6cbb8'; g.fillRect(x + 2, y + 2, 5, 1); g.fillRect(x + 7, y + 2, 5, 1); g.fillRect(x + 6, y + 3, 2, 1);
  g.fillStyle = '#c4544a'; g.fillRect(x + 6, y + 4, 2, 2);
}

export type IconKey = 'ask' | 'sleep' | 'think' | 'stuck' | 'book' | 'wait';
const ICONS: Record<IconKey, { bg: string; rows: readonly string[] }> = {
  ask: { bg: '#e6b450', rows: ['..o..', '..o..', '..o..', '.....', '..o..'] },
  sleep: { bg: '#72a9e6', rows: ['ooooo', '...o.', '..o..', '.o...', 'ooooo'] },
  think: { bg: '#e8e2d6', rows: ['.....', '.....', 'o.o.o', '.....', '.....'] },
  stuck: { bg: '#e2654f', rows: ['o.o.o', '.ooo.', 'ooooo', '.ooo.', 'o.o.o'] },
  book: { bg: '#9a6ad0', rows: ['oo.oo', 'oo.oo', 'oo.oo', 'oo.oo', '.....'] },
  wait: { bg: '#aaa496', rows: ['.ooo.', 'o...o', '...o.', '.....', '..o..'] }
};
const ICON_PX = 2; // 아이콘 한 칸 크기 (16px 타일에서 잘 보이게 2배)

export function drawIcon(g: CanvasRenderingContext2D, key: IconKey, centerX: number, bottom: number): void {
  const icon = ICONS[key];
  const size = 7 * ICON_PX;
  const x = Math.round(centerX - size / 2), y = Math.round(bottom - size);
  g.fillStyle = '#221a26'; g.fillRect(x - ICON_PX, y - ICON_PX, size + ICON_PX * 2, size + ICON_PX * 2);
  g.fillStyle = icon.bg; g.fillRect(x, y, size, size);
  g.fillStyle = '#221a26';
  icon.rows.forEach((row, r) => [...row].forEach((ch, k) => {
    if (ch === 'o') g.fillRect(x + (1 + k) * ICON_PX, y + (1 + r) * ICON_PX, ICON_PX, ICON_PX);
  }));
}
