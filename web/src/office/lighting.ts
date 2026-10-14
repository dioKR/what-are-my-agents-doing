// 실제 시각에 맞춘 낮·저녁·밤 분위기와 밤 조명.
export type TimeMode = 'auto' | 'day' | 'evening' | 'night';

export interface Ambient {
  /** 화면 전체를 덮는 어둠의 진하기 0~1 */
  darkness: number;
  /** 어둠 색 (r,g,b) */
  tint: string;
  sky: string;
  night: boolean;
}

const DAY: Ambient = { darkness: 0, tint: '0,0,0', sky: '#9fd6f2', night: false };
const EVENING: Ambient = { darkness: 0.28, tint: '90,40,60', sky: '#f2a65a', night: false };
const NIGHT: Ambient = { darkness: 0.55, tint: '12,16,48', sky: '#1c2440', night: true };

export function ambientAt(mode: TimeMode, date: Date): Ambient {
  if (mode === 'day') return DAY;
  if (mode === 'evening') return EVENING;
  if (mode === 'night') return NIGHT;
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 7 && hour < 17) return DAY;
  if (hour >= 17 && hour < 19.5) return EVENING;
  if (hour >= 5 && hour < 7) return { ...EVENING, darkness: 0.2, sky: '#f5c9a0' };
  return NIGHT;
}

export interface LightSource { x: number; y: number; r: number; color: string }

/** 어둠을 깔고 불빛 자리만 밝게 뚫는다. 낮이면 아무것도 하지 않는다. */
export function drawLighting(g: CanvasRenderingContext2D, layer: HTMLCanvasElement, ambient: Ambient, lights: LightSource[]): void {
  if (ambient.darkness <= 0) return;
  const lg = layer.getContext('2d')!;
  lg.globalCompositeOperation = 'source-over';
  lg.clearRect(0, 0, layer.width, layer.height);
  lg.fillStyle = `rgba(${ambient.tint},${ambient.darkness})`;
  lg.fillRect(0, 0, layer.width, layer.height);
  lg.globalCompositeOperation = 'destination-out';
  for (const light of lights) {
    const grad = lg.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = grad;
    lg.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
  }
  g.drawImage(layer, 0, 0);
  // 불빛 색이 은은하게 번지도록 한 번 더 더한다
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const light of lights) {
    const grad = g.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r * 0.7);
    grad.addColorStop(0, `rgba(${light.color},${ambient.night ? 0.22 : 0.1})`);
    grad.addColorStop(1, `rgba(${light.color},0)`);
    g.fillStyle = grad;
    g.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
  }
  g.restore();
}
