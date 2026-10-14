// 손으로 찍은 기본 캐릭터 목록. 기본 캐릭터 id(look.ts의 PRESETS) → 그림
import { EUNSEO } from './eunseo.ts';
import { PINK } from './pink.ts';
import { RABI } from './rabi.ts';
import type { CharacterArt } from './types.ts';
import { WHITE } from './white.ts';

export const CHARACTER_ART: Record<string, CharacterArt> = { pink: PINK, white: WHITE, rabi: RABI, eunseo: EUNSEO };
