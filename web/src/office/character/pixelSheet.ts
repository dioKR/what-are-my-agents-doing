// 작은 픽셀 도화지. 색을 칠한 뒤 바깥 테두리를 자동으로 둘러 준다.
// 캐릭터 부품을 그릴 때 외곽선을 일일이 신경 쓰지 않아도 되게 하려는 것이다.

export class PixelSheet {
  readonly width: number;
  readonly height: number;
  private readonly pixels: Array<string | null>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = Array<string | null>(width * height).fill(null);
  }

  set(x: number, y: number, color: string): void {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    this.pixels[iy * this.width + ix] = color;
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.pixels[y * this.width + x];
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color);
  }

  /** 타원 채우기. keep으로 일부만 칠할 수 있다 (예: 윗부분만) */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, keep: (x: number, y: number) => boolean = () => true): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - (cx + 0.5)) / rx, dy = (y + 0.5 - (cy + 0.5)) / ry;
        if (dx * dx + dy * dy <= 1 && keep(x, y)) this.set(x, y, color);
      }
    }
  }

  /** 이미 칠한 칸만 골라 색을 바꾼다 (그늘·하이라이트용) */
  recolor(predicate: (x: number, y: number, color: string) => boolean, color: string): void {
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      const c = this.get(x, y);
      if (c && predicate(x, y, c)) this.set(x, y, color);
    }
  }

  /** 칠한 영역 바로 바깥 칸(상하좌우)에 외곽선을 두른다 */
  outline(color: string): void {
    const edge: Array<[number, number]> = [];
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) edge.push([x, y]);
    }
    edge.forEach(([x, y]) => this.set(x, y, color));
  }

  toCanvas(flipX = false): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width; canvas.height = this.height;
    const g = canvas.getContext('2d')!;
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      const c = this.get(x, y);
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(flipX ? this.width - 1 - x : x, y, 1, 1);
    }
    return canvas;
  }
}

/** #rrggbb 색을 밝게(+) 또는 어둡게(-) 한다. amount는 -1~1 */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  const r = channel((n >> 16) & 255), g = channel((n >> 8) & 255), b = channel(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
