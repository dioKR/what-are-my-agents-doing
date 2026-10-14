// 손으로 찍은 캐릭터 도트의 모양
export type View = 'down' | 'up' | 'left';
export type StepPose = 'stand' | 'step1' | 'step2';
export type ArmPose = 'down' | 'swing1' | 'swing2' | 'type1' | 'type2' | 'raise' | 'chin' | 'up';

/** 32칸 너비 덧칠. y는 첫 줄이 놓이는 줄 */
export interface Stamp { y: number; rows: string[] }
export interface Box { x: number; y: number; w: number; h: number }

export interface CharacterArt {
  /** 머리 0~22줄. 방향마다 한 장씩 (오른쪽은 왼쪽을 뒤집어 쓴다) */
  head: Record<View, string[]>;
  /** 표정을 바꿀 때 다시 칠하는 눈 자리 (뒷모습은 없음) */
  eyes: { down: Box[]; left: Box[] };
  mouth: { down: { x: number; y: number; w: number }; left: { x: number; y: number; w: number } };
  /** 머리카락 맨 윗줄. 왕관 같은 소품을 이 위에 얹는다 */
  hairTop: Record<View, number>;
  /** 어깨 아래로 내려오는 긴 머리 (0줄부터 센 덧칠). 몸통 위, 팔 아래에 그린다 */
  longHair?: Record<View, string[]>;
  /** 머리 위 여백 4줄에 그리는 것 (말린 바보털 등) */
  crest?: Record<View, string[]>;
  outfit: 'hoodie' | 'blouseSkirt' | 'shirtTie' | 'staffTee';
  legs: 'pants' | 'bare';
  sleeves: 'long' | 'short';
  /** 꾸미기로 바뀌지 않는 이 캐릭터만의 색 (헤드폰, 반창고 등) */
  fixed: Record<string, string>;
}
