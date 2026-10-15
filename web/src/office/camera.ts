// 지도 확대 · 이동. 카메라는 보이는 영역의 왼쪽 위(x, y, 지도 픽셀)와 배율(zoom)이다.
// 지도가 보이는 틀을 벗어나 빈 곳이 보이지 않도록 늘 안쪽으로 맞춘다.

export interface Camera {
  zoom: number;
  /** 보이는 영역 왼쪽 위 (지도 픽셀, 기본 보기의 왼쪽 위가 0) */
  x: number;
  y: number;
}

export interface ViewSize { w: number; h: number }

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
/** + · − 단추 한 번에 바뀌는 배율 */
export const ZOOM_STEP = 1.25;
export const HOME: Camera = { zoom: 1, x: 0, y: 0 };

/** 배율을 범위 안으로, 보이는 영역을 지도 안으로 */
export function clampCamera(camera: Camera, view: ViewSize): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom));
  const maxX = view.w - view.w / zoom;
  const maxY = view.h - view.h / zoom;
  return { zoom, x: Math.min(maxX, Math.max(0, camera.x)), y: Math.min(maxY, Math.max(0, camera.y)) };
}

/** focus(지도 픽셀)가 화면에서 제자리에 있도록 하며 factor배 확대한다 (1보다 작으면 축소) */
export function zoomAt(camera: Camera, factor: number, focus: { x: number; y: number }, view: ViewSize): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor));
  // 확대 전후로 focus가 보이는 영역 안에서 같은 비율 자리에 있게 한다
  const x = focus.x - (focus.x - camera.x) * (camera.zoom / zoom);
  const y = focus.y - (focus.y - camera.y) * (camera.zoom / zoom);
  return clampCamera({ zoom, x, y }, view);
}

/** 지도 픽셀 단위로 움직인다 (끌면 끈 반대쪽으로 영역이 움직이므로 부르는 쪽에서 부호를 정한다) */
export function panBy(camera: Camera, dx: number, dy: number, view: ViewSize): Camera {
  return clampCamera({ ...camera, x: camera.x + dx, y: camera.y + dy }, view);
}

/** 보이는 영역의 가운데 (지도 픽셀) */
export const centerOf = (camera: Camera, view: ViewSize) => ({ x: camera.x + view.w / camera.zoom / 2, y: camera.y + view.h / camera.zoom / 2 });
