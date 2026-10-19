import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centerOf, clampCamera, HOME, MAX_ZOOM, panBy, zoomAt } from './camera.ts';

const view = { w: 600, h: 400 };

test('배율은 1~3, 보이는 영역은 지도 밖으로 나가지 않는다', () => {
  assert.deepEqual(clampCamera({ zoom: 5, x: -10, y: 999 }, view), { zoom: MAX_ZOOM, x: 0, y: 400 - 400 / 3 });
  assert.deepEqual(clampCamera({ zoom: 0.5, x: 50, y: 50 }, view), HOME);
});

test('확대해도 짚은 곳은 화면에서 제자리에 있다', () => {
  const focus = { x: 150, y: 100 };
  const zoomed = zoomAt(HOME, 2, focus, view);
  assert.equal(zoomed.zoom, 2);
  // 화면 비율 자리: 확대 전 (150-0)/600 = 0.25 → 확대 후 (150-x)/(600/2)도 0.25
  assert.equal((focus.x - zoomed.x) / (view.w / zoomed.zoom), 0.25);
  assert.equal((focus.y - zoomed.y) / (view.h / zoomed.zoom), 0.25);
  // 다시 축소하면 처음으로
  assert.deepEqual(zoomAt(zoomed, 0.5, focus, view), HOME);
});

test('확대한 상태에서만 움직일 수 있고, 가장자리에서 멈춘다', () => {
  assert.deepEqual(panBy(HOME, 30, 30, view), HOME);
  const zoomed = zoomAt(HOME, 2, centerOf(HOME, view), view);
  assert.deepEqual(centerOf(zoomed, view), { x: 300, y: 200 });
  assert.deepEqual(panBy(zoomed, 1000, -1000, view), { zoom: 2, x: 300, y: 0 });
});
