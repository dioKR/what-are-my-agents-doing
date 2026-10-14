// 불러온 캐릭터 시트(PNG)를 들고 있다가, 장면 하나(32×44)를 잘라 준다.
import { cellOrigin, SHEET_CELL_H, SHEET_CELL_W, SHEET_FACINGS, SHEET_HEIGHT, SHEET_POSES, SHEET_WIDTH, type SheetFacing, type SheetPose } from '../../../../shared/characterSheet.ts';
import { resolveCell, type IsEmptyCell } from './sheetCells.ts';

interface LoadedSheet {
  canvas: HTMLCanvasElement;
  isEmpty: IsEmptyCell;
}

const sheets = new Map<string, LoadedSheet>();

/** 시트 그림을 도화지에 옮기고, 칸마다 비었는지 알아 둔다. 크기가 다르면 null */
export function readSheet(image: CanvasImageSource & { width: number; height: number }): LoadedSheet | null {
  if (image.width !== SHEET_WIDTH || image.height !== SHEET_HEIGHT) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(image, 0, 0);
  const pixels = g.getImageData(0, 0, SHEET_WIDTH, SHEET_HEIGHT).data;
  const empty = new Set<string>();
  for (const facing of SHEET_FACINGS) {
    for (const pose of SHEET_POSES) {
      if (cellIsTransparent(pixels, facing, pose)) empty.add(`${facing}:${pose}`);
    }
  }
  return { canvas, isEmpty: (facing, pose) => empty.has(`${facing}:${pose}`) };
}

function cellIsTransparent(pixels: Uint8ClampedArray, facing: SheetFacing, pose: SheetPose): boolean {
  const { x, y } = cellOrigin(facing, pose);
  for (let row = y; row < y + SHEET_CELL_H; row++) {
    for (let col = x; col < x + SHEET_CELL_W; col++) {
      if (pixels[(row * SHEET_WIDTH + col) * 4 + 3] > 0) return false;
    }
  }
  return true;
}

export function addSheet(id: string, sheet: LoadedSheet): void { sheets.set(id, sheet); }
export function removeSheet(id: string): void { sheets.delete(id); }
export const hasSheet = (id: string): boolean => sheets.has(id);

/** 이 장면의 그림. 시트를 아직 못 불러왔거나 쓸 칸이 없으면 null */
export function sheetFrame(id: string, facing: SheetFacing, pose: SheetPose): HTMLCanvasElement | null {
  const sheet = sheets.get(id);
  const source = sheet && resolveCell(sheet.isEmpty, facing, pose);
  if (!sheet || !source) return null;
  const { x, y } = cellOrigin(source.facing, source.pose);
  const frame = document.createElement('canvas');
  frame.width = SHEET_CELL_W;
  frame.height = SHEET_CELL_H;
  const g = frame.getContext('2d')!;
  if (source.mirrored) {
    g.translate(SHEET_CELL_W, 0);
    g.scale(-1, 1);
  }
  g.drawImage(sheet.canvas, x, y, SHEET_CELL_W, SHEET_CELL_H, 0, 0, SHEET_CELL_W, SHEET_CELL_H);
  return frame;
}
