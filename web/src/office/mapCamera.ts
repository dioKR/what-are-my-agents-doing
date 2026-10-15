// 지도 확대 · 이동 조작: 끌어서 이동, 트랙패드 핀치 · Ctrl(⌘)+휠로 확대, + · − · 맞추기 단추.
// 지도 그림(canvas)만 CSS로 키우고 옮긴다. 이름표 · 말풍선은 글자 크기는 그대로 두고 자리만 따라간다(labelFrame).
import { centerOf, clampCamera, HOME, panBy, zoomAt, ZOOM_STEP, type Camera, type ViewSize } from './camera.ts';

/** 이만큼(화면 px) 넘게 움직여야 끌기로 본다. 그보다 적으면 클릭(캐릭터 고르기) */
const DRAG_THRESHOLD_PX = 4;
/** 핀치 · Ctrl+휠 한 칸의 확대 정도 */
const WHEEL_ZOOM_SPEED = 0.01;

export class MapCamera {
  camera: Camera = HOME;
  /** 화면 px / 지도 px (창 크기에 맞춘 기본 배율, 확대 전) */
  private fitScale = 1;
  private drag: { pointerId: number; startX: number; startY: number; last: Camera; moved: boolean } | null = null;
  private suppressClick = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly view: ViewSize;
  private readonly onChange: () => void;

  constructor(canvas: HTMLCanvasElement, view: ViewSize, onChange: () => void) {
    this.canvas = canvas;
    this.view = view;
    this.onChange = onChange;
    canvas.style.transformOrigin = '0 0';
    canvas.addEventListener('pointerdown', (e) => this.startDrag(e));
    canvas.addEventListener('pointermove', (e) => this.moveDrag(e));
    canvas.addEventListener('pointerup', (e) => this.endDrag(e));
    canvas.addEventListener('pointercancel', (e) => this.endDrag(e));
    // 끌고 난 뒤의 click은 캐릭터 고르기로 쓰지 않는다 (캡처 단계에서 먼저 막는다)
    canvas.addEventListener('click', (e) => { if (this.suppressClick) { e.stopImmediatePropagation(); this.suppressClick = false; } }, true);
    canvas.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
  }

  /** 창 크기에 맞춘 기본 배율이 바뀌면 부른다 */
  setFitScale(scale: number): void {
    this.fitScale = scale;
    this.apply();
  }

  zoomIn(): void { this.set(zoomAt(this.camera, ZOOM_STEP, centerOf(this.camera, this.view), this.view)); }
  zoomOut(): void { this.set(zoomAt(this.camera, 1 / ZOOM_STEP, centerOf(this.camera, this.view), this.view)); }
  reset(): void { this.set(HOME); }

  /** 이름표 층이 쓸 배율과 왼쪽 위 (지도 px, 기본 보기 기준) */
  labelFrame(): { scale: number; x: number; y: number } {
    return { scale: this.fitScale * this.camera.zoom, x: this.camera.x, y: this.camera.y };
  }

  private set(next: Camera): void {
    this.camera = clampCamera(next, this.view);
    this.apply();
    this.onChange();
  }

  private apply(): void {
    const { zoom, x, y } = this.camera;
    const unit = this.fitScale * zoom;
    this.canvas.style.transform = zoom === 1 ? '' : `translate(${-x * unit}px, ${-y * unit}px) scale(${zoom})`;
    this.canvas.classList.toggle('zoomed', zoom > 1);
  }

  /** 화면 좌표 → 지도 px (기본 보기 기준) */
  private mapPointOf(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * this.view.w, y: ((e.clientY - rect.top) / rect.height) * this.view.h };
  }

  private startDrag(e: PointerEvent): void {
    if (e.button !== 0 || this.camera.zoom === 1) return;
    this.drag = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, last: this.camera, moved: false };
  }

  private moveDrag(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!drag.moved) { drag.moved = true; this.canvas.setPointerCapture(e.pointerId); this.canvas.classList.add('dragging'); }
    const unit = this.fitScale * this.camera.zoom;
    this.set(panBy(drag.last, -dx / unit, -dy / unit, this.view));
  }

  private endDrag(e: PointerEvent): void {
    if (!this.drag || this.drag.pointerId !== e.pointerId) return;
    this.suppressClick = this.drag.moved;
    this.drag = null;
    this.canvas.classList.remove('dragging');
  }

  /** 트랙패드 핀치(브라우저가 Ctrl+휠로 보낸다)와 Ctrl(⌘)+휠만 확대로 쓴다. 그냥 휠은 페이지 스크롤로 둔다 */
  private wheel(e: WheelEvent): void {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.set(zoomAt(this.camera, Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), this.mapPointOf(e), this.view));
  }
}
