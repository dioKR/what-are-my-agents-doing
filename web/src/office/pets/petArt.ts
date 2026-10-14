// 펫 도트: 왼쪽을 보는 16×14 그림 (서기 · 걷기 2장). 오른쪽은 뒤집어 쓴다. 발바닥 아래 줄은 13.
// 글자 → 색은 palette. '0'은 테두리, '.'은 빈 칸.
import type { PetItem } from '../../../../shared/shop.ts';

export const PET_W = 16;
export const PET_H = 14;
export type PetFrame = 'idle' | 'walk1' | 'walk2';

export const PET_ART: Record<PetItem, { palette: Record<string, string> } & Record<PetFrame, string[]>> = {
  cat: {
    palette: {'0': '#5a3418', 'B': '#f2a85a', 'b': '#fbe0bf', 'D': '#c86f2c', 'e': '#2a2232', 'n': '#ff8fae'},
    idle: [
      '..0...0.........',
      '.0B0.0B0........',
      '.0nB0Bn0......0.',
      '.0BBBBB0.....0D0',
      '0BBBBBBB0.....0D',
      '0BeBBBBB00000.0D',
      '0BeBBBBBBBBBB00D',
      '0nBBBBBBBDBDBBD0',
      '.0BBBBBBBBDBBB0.',
      '..000BBBBBBBBB0.',
      '.....0bbbbbbb0..',
      '....0B0b000B0b0.',
      '....0B0b0.0B0b0.',
      '.....0.0...0.0..'
    ],
    walk1: [
      '..0...0.........',
      '.0B0.0B0........',
      '.0nB0Bn0......0.',
      '.0BBBBB0.....0D0',
      '0BBBBBBB0.....0D',
      '0BeBBBBB00000.0D',
      '0BeBBBBBBBBBB00D',
      '0nBBBBBBBDBDBBD0',
      '.0BBBBBBBBDBBB0.',
      '..000BBBBBBBBB0.',
      '....00bbbbbbb0..',
      '...0B000b0B00b0.',
      '...0B0.0b0B00b0.',
      '....0...0.0..0..'
    ],
    walk2: [
      '..0...0.........',
      '.0B0.0B0........',
      '.0nB0Bn0......0.',
      '.0BBBBB0.....0D0',
      '0BBBBBBB0.....0D',
      '0BeBBBBB00000.0D',
      '0BeBBBBBBBBBB00D',
      '0nBBBBBBBDBDBBD0',
      '.0BBBBBBBBDBBB0.',
      '..000BBBBBBBBB0.',
      '.....0bbbbbbb0..',
      '.....0Bb0000b0..',
      '.....0Bb0..0b0..',
      '......00....0...'
    ]
  },
  dog: {
    palette: {'0': '#5a4636', 'B': '#f4e6d0', 'b': '#ffffff', 'D': '#8a5a36', 'e': '#2a2232', 'n': '#2a2232'},
    idle: [
      '................',
      '................',
      '..00000.........',
      '.0BBBBD0........',
      '0BBBBBDD0......0',
      '0BeBBBDD00000.0B',
      '0BeBBBDDBBBBB00B',
      '0nBBBBDDBBBBDBB0',
      '.0BBBBBBBBBDBB0.',
      '..000BBBBBBBBB0.',
      '.....0bbbbbbb0..',
      '....0B0b000B0b0.',
      '....0B0b0.0B0b0.',
      '.....0.0...0.0..'
    ],
    walk1: [
      '................',
      '................',
      '..00000.........',
      '.0BBBBD0........',
      '0BBBBBDD0......0',
      '0BeBBBDD00000.0B',
      '0BeBBBDDBBBBB00B',
      '0nBBBBDDBBBBDBB0',
      '.0BBBBBBBBBDBB0.',
      '..000BBBBBBBBB0.',
      '....00bbbbbbb0..',
      '...0B000b0B00b0.',
      '...0B0.0b0B00b0.',
      '....0...0.0..0..'
    ],
    walk2: [
      '................',
      '................',
      '..00000.........',
      '.0BBBBD0........',
      '0BBBBBDD0......0',
      '0BeBBBDD00000.0B',
      '0BeBBBDDBBBBB00B',
      '0nBBBBDDBBBBDBB0',
      '.0BBBBBBBBBDBB0.',
      '..000BBBBBBBBB0.',
      '.....0bbbbbbb0..',
      '.....0Bb0000b0..',
      '.....0Bb0..0b0..',
      '......00....0...'
    ]
  },
  slime: {
    palette: {'0': '#2f7a46', 'B': '#6fd88a', 'L': '#d6ffe0', 'e': '#1e4a2c'},
    idle: [
      '................',
      '................',
      '................',
      '.....000000.....',
      '....0BBBBBB0....',
      '...0BBBBBBBB0...',
      '..0BBBBBBBBBB0..',
      '.0BBLLBBBBBBBB0.',
      '.0BBBBBBBBBBBB0.',
      '.0BBBeBBBeBBBB0.',
      '..0BBBBBBBBBB0..',
      '..0BBBBBBBBBB0..',
      '...00BBBBBB00...',
      '.....000000.....'
    ],
    walk1: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '....00000000....',
      '..00BBBBBBBB00..',
      '.0BBLLBBBBBBBB0.',
      '0BBBBBBBBBBBBBB0',
      '0BBBBeBBBeBBBBB0',
      '0BBBBBBBBBBBBBB0',
      '.0BBBBBBBBBBBB0.',
      '..00BBBBBBBB00..',
      '....00000000....'
    ],
    walk2: [
      '................',
      '.......00.......',
      '.....00BB00.....',
      '....0BBBBBB0....',
      '...0BBBBBBBB0...',
      '..0BBBBBBBBBB0..',
      '..0BLLBBBBBBB0..',
      '..0BBBBBBBBBB0..',
      '..0BBeBBBeBBB0..',
      '..0BBBBBBBBBB0..',
      '..0BBBBBBBBBB0..',
      '...0BBBBBBBB0...',
      '....0BBBBBB0....',
      '.....000000.....'
    ]
  },
  chick: {
    palette: {'0': '#a8721a', 'B': '#ffd84d', 'b': '#f2b632', 'e': '#2a2232', 'A': '#ff9a3c'},
    idle: [
      '................',
      '.........0......',
      '........0B0.....',
      '......00B0......',
      '.....0BBBB0.....',
      '....0BBBBBB0....',
      '..00BeBBBBBB0...',
      '.0AABBBBBBBB0...',
      '..00BBBBBbbB0...',
      '...0BBBBBbbB0...',
      '....0BBBBBB0....',
      '.....0BABA0.....',
      '......0A0A0.....',
      '.......0.0......'
    ],
    walk1: [
      '................',
      '.........0......',
      '........0B0.....',
      '......00B0......',
      '.....0BBBB0.....',
      '....0BBBBBB0....',
      '..00BeBBBBBB0...',
      '.0AABBBBBBBB0...',
      '..00BBBBBbbB0...',
      '...0BBBBBbbB0...',
      '....0BBBBBB0....',
      '.....0ABBBA0....',
      '.....0A000A0....',
      '......0...0.....'
    ],
    walk2: [
      '.........0......',
      '........0B0.....',
      '......00B0......',
      '.....0BBBB0.....',
      '....0BBBBBB0....',
      '..00BeBBBBBB0...',
      '.0AABBBBBBBB0...',
      '..00BBBBBbbB0...',
      '...0BBBBBbbB0...',
      '....0BBBBBB0....',
      '.....0BBBB0.....',
      '......0000......',
      '.......0AA0.....',
      '........00......'
    ]
  }
};
