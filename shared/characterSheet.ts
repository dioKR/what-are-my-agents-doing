// 캐릭터 시트: 사용자가 PNG 한 장으로 그려 넣는 캐릭터. 서버(올린 파일 검사·저장)와 화면(그리기·템플릿)이 같은 칸 배치를 쓴다.
//
// 칸 하나 = 32×44 (캐릭터 한 장면). 가로 줄 = 바라보는 방향, 세로 칸 = 자세.
//          stand walk1 walk2 sit type1 type2 think raise drink stretch carry
//   down
//   up
//   left
//   right   ← 비워 두면 왼쪽 줄을 뒤집어 쓴다
// 비워 둔 자세는 같은 방향의 stand를 쓴다. 꼭 그려야 하는 칸은 REQUIRED_CELLS.

export const SHEET_CELL_W = 32;
export const SHEET_CELL_H = 44;
export const SHEET_FACINGS = ['down', 'up', 'left', 'right'] as const;
export const SHEET_POSES = ['stand', 'walk1', 'walk2', 'sit', 'type1', 'type2', 'think', 'raise', 'drink', 'stretch', 'carry'] as const;
export const SHEET_WIDTH = SHEET_CELL_W * SHEET_POSES.length;
export const SHEET_HEIGHT = SHEET_CELL_H * SHEET_FACINGS.length;
/** 올릴 수 있는 시트 파일의 최대 크기 */
export const MAX_SHEET_BYTES = 512 * 1024;
export const MAX_CHARACTER_NAME_LENGTH = 24;

export type SheetFacing = (typeof SHEET_FACINGS)[number];
export type SheetPose = (typeof SHEET_POSES)[number];

/** 앞 · 뒤 · 왼쪽으로 서 있기와 걷기 두 장. 이것만 있으면 사무실을 돌아다닐 수 있다 */
export const REQUIRED_CELLS: ReadonlyArray<[SheetFacing, SheetPose]> = (['down', 'up', 'left'] as const).flatMap(
  (facing) => (['stand', 'walk1', 'walk2'] as const).map((pose): [SheetFacing, SheetPose] => [facing, pose])
);

/** 시트에서 이 장면 칸의 왼쪽 위 좌표 */
export const cellOrigin = (facing: SheetFacing, pose: SheetPose) => ({
  x: SHEET_POSES.indexOf(pose) * SHEET_CELL_W,
  y: SHEET_FACINGS.indexOf(facing) * SHEET_CELL_H
});

/** 사용자가 올린 캐릭터 (그림은 따로 /api/characters/<id>.png) */
export interface CustomCharacter {
  id: string;
  name: string;
  createdAt: number;
}

/** 꾸미기에서 이 캐릭터를 고르면 look.character에 'sheet:<id>'를 넣는다 */
export const SHEET_CHARACTER_PREFIX = 'sheet:';
export const sheetIdOf = (character: string | undefined): string | null =>
  character?.startsWith(SHEET_CHARACTER_PREFIX) ? character.slice(SHEET_CHARACTER_PREFIX.length) : null;
