// 하얀 머리 사원: 동글동글 곱슬 머리, 호박색 눈, 반팔 셔츠와 넥타이, 목걸이 사원증, 흰 운동화
import type { CharacterArt } from './types.ts';

export const WHITE: CharacterArt = {
  head: {
    down: [
      '..............oooo..............',
      '...........oooHHHHooo...........',
      '.........ooHHHHHHHHHHoo.........',
      '........oHHHHHHHHHHHHHHo........',
      '.......oHHHhhhhHHHHHHHHHo.......',
      '......oHHhhhHHHHHHHHHHdHHo......',
      '......oHhHHHHHHHHHHHHHHdHo......',
      '.....oHhHHHHHHHHHHHHHHHHdHo.....',
      '.....oHhHHHHHHHHHHHHHHHHHdo.....',
      '....oHHHHHHHHHHHHHHHHHHHHdHo....',
      '....oHHHHHHHHHHHHHHHHHHHHdHo....',
      '....oHHHHHdHHHdHHdHHHdHHHdHo....',
      '....oHdHHHdHHHdHHdHHHdHHHdHo....',
      '....oHdHHHHdHdHdHHdHdHHHHdHo....',
      '....oHdHHHdodoHHdHododHHHdHo....',
      '....oHHHHdeeesdHodseeedHHHHo....',
      '.....oHHdoEEwsodsosEEwodHHo.....',
      '.....oHdosEEEssosssEEEsodHo.....',
      '.....oHosseeesssssseeessoHo.....',
      '.....odobbssssssssssssbbodo.....',
      '......o..psssssmmsssssp..o......',
      '..........pssssssssssp..........',
      '...........pppppppppp...........'
    ],
    up: [
      '..............oooo..............',
      '...........oooHHHHooo...........',
      '.........ooHHHHHHHHHHoo.........',
      '........oHHHHHHHHHHHHHHo........',
      '.......oHHHhhhhHHHHHHHHHo.......',
      '......oHHhhhHHHHHHHHHHdHHo......',
      '......oHhHHHHHHHHHHHHHHdHo......',
      '.....oHhHHHHHHHHHHHHHHHHdHo.....',
      '.....oHhHHHHHHHHHHHHHHHHHdo.....',
      '....oHHHHHHHHHHHHHHHHHHHHdHo....',
      '....oHHHHHHHHHHHHHHHHHHHHdHo....',
      '....oHHHHHHHHHHHHHHHHHHHHdHo....',
      '....oHHHHHHHHHHHHHHHHHHHHdHo....',
      '....oHHHHHHdHHHHdHHHHdHHHHHo....',
      '....oHHHHHHdHHHHdHHHHdHHHHHo....',
      '....oHHHHHHHdHHHdHHHdHHHHHHo....',
      '....oHHHHHHHHHHHdHHHHHHHHHHo....',
      '....oHHHHHHHHHHHHHHHHHHHHHHo....',
      '....oHdHHHHHHHHHHHHHHHHHddHo....',
      '.....oodHdHHHHHHHHHHHdHdooo.....',
      '.......ododHdHHHHHdHdodo........',
      '........o.ododHdHdodo.o.........',
      '...........o.ododo.o............'
    ],
    left: [
      '...............oo...............',
      '...........ooooHHoooo...........',
      '..........oHHHHHHHHHHo..........',
      '........ooHHhhhHHHHHHHoo........',
      '.......oHHhhHHHHHHHHHHHHo.......',
      '......oHHhHHHHHHHHHHHHHHHo......',
      '......oHhHHHHHHHHHHHHHHHHo......',
      '.....oHHHHHHHHHHHHHHHHHHHHo.....',
      '.....oHHHHHHHHHHHHHHHHHHHHo.....',
      '....oHHHHHHHHHHHHHHHHHHHHHo.....',
      '....oHHHHHHHHHHHHHHHHHHHdHo.....',
      '....oHHHHHHHHHHHHoHHHdHHdHo.....',
      '....oHHHHHHHHHHHHsHHHdHHHHo.....',
      '....oHHdHHdHdHHHHsHHdHHHHHo.....',
      '....odHodHododHHHsHHHHHHHHo.....',
      '.....oeeedsosodHHHHHHHHHHo......',
      '......EEwossssodHHHHHHHHdo......',
      '......EEEssssssodHHHHHHdo.......',
      '......eeesssssssoHHHHHdo........',
      '......bbsssssssssdHdHdo.........',
      '.......msssssssssododo..........',
      '........ppssskssp.o.o...........',
      '..........pppkssp...............'
    ]
  },
  crest: {
    down: [
      '................ooo.............',
      '...............oHHHo............',
      '...............oHooHo...........',
      '...............oHo.oo...........'
    ],
    up: [
      '................ooo.............',
      '...............oHHHo............',
      '...............oHooHo...........',
      '...............oHo.oo...........'
    ],
    left: [
      '..............ooo...............',
      '.............oHHHo..............',
      '.............oHooHo.............',
      '.............oHo.oo.............'
    ]
  },
  eyes: { down: [{ x: 10, y: 15, w: 3, h: 4 }, { x: 19, y: 15, w: 3, h: 4 }], left: [{ x: 6, y: 15, w: 3, h: 4 }] },
  mouth: { down: { x: 15, y: 20, w: 2 }, left: { x: 7, y: 20, w: 1 } },
  hairTop: { down: 2, up: 2, left: 1 },
  outfit: 'shirtTie',
  legs: 'pants',
  sleeves: 'short',
  fixed: { X: '#1d1d22', Y: '#2f6fe0', Z: '#a8d4ff', V: '#c9ccd2', S: '#f4f4f6', T: '#b9bec8' }
};
