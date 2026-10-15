// 캐릭터 시트에서 비어 있는 칸을 무엇으로 채울지 정한다 (그림 없이 칸 이름만 다루는 순수 함수).
import { REQUIRED_CELLS, type SheetFacing, type SheetPose } from '../../../../shared/characterSheet.ts';

export type IsEmptyCell = (facing: SheetFacing, pose: SheetPose) => boolean;

export interface CellSource {
  facing: SheetFacing;
  pose: SheetPose;
  /** 오른쪽 모습을 왼쪽 그림을 뒤집어 쓸 때 true */
  mirrored: boolean;
}

/**
 * 이 장면에 쓸 칸. 그 칸이 비었으면 같은 방향의 stand,
 * 오른쪽 줄이 비었으면 왼쪽 줄을 뒤집어 쓴다. 쓸 칸이 없으면 null.
 */
export function resolveCell(isEmpty: IsEmptyCell, facing: SheetFacing, pose: SheetPose): CellSource | null {
  const candidates: CellSource[] = [
    { facing, pose, mirrored: false },
    { facing, pose: 'stand', mirrored: false },
    ...(facing === 'right' ? [{ facing: 'left', pose, mirrored: true }, { facing: 'left', pose: 'stand', mirrored: true }] as CellSource[] : [])
  ];
  return candidates.find((c) => !isEmpty(c.facing, c.pose)) ?? null;
}

/** 꼭 그려야 하는데 비어 있는 칸들 */
export const missingCells = (isEmpty: IsEmptyCell) => REQUIRED_CELLS.filter(([facing, pose]) => isEmpty(facing, pose));
