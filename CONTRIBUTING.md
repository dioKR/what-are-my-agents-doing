# Contributing

Thanks for helping! Issues and PRs are welcome, in English or Korean.

## Setup

```bash
npm install
npm run dev      # UI with hot reload (http://localhost:5173), /api is proxied to 4545
npm run server   # local server (4545) in another terminal
```

Node.js 23.6 or later runs the TypeScript sources directly.

## Checks (CI runs these on every PR)

```bash
npm run typecheck
npm test                        # server logic, wallet rules, pixel art data
npm run build && npm run test:e2e   # opens the page in your installed Chrome and checks for errors
```

A PR can be merged when CI is green. If the browser test fails, CI keeps a screenshot as an artifact.

## Pixel art

Characters, outfits, accessories and pets are hand-placed pixels stored as letter maps in
`web/src/office/character/sprites/` and `web/src/office/pets/petArt.ts`. One letter is one pixel; each letter maps to a color.
The tests check that every row has the right length and every letter has a color.
Preview every direction, pose and accessory at http://localhost:5173/dev/sprite-test.html (`?c=pink|white|brown|black`).

## Adding a shop item

1. Add it to `SHOP_ITEMS` in `shared/shop.ts` (id, slot, price, Korean and English names).
2. Draw it: headwear in `ACCESSORY_ART` (`sprites/accessories.ts`), pets in `PET_ART` (`pets/petArt.ts`).
3. `npm test` tells you if something is missing.
