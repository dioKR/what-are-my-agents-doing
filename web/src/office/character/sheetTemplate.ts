// 캐릭터 시트 템플릿: 지금 캐릭터의 모든 장면을 시트 칸 배치대로 PNG 한 장에 그린다.
// 사용자는 이 그림 위에 덧칠해서 자기 캐릭터를 만든다.
import { cellOrigin, SHEET_FACINGS, SHEET_HEIGHT, SHEET_POSES, SHEET_WIDTH } from '../../../../shared/characterSheet.ts';
import { dollFrame, type DollLook } from './doll.ts';

export function sheetTemplateOf(look: DollLook): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const g = canvas.getContext('2d')!;
  for (const facing of SHEET_FACINGS) {
    for (const pose of SHEET_POSES) {
      const { x, y } = cellOrigin(facing, pose);
      g.drawImage(dollFrame(look, facing, pose, 'normal'), x, y);
    }
  }
  return canvas;
}
