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

## Changesets (please add one to your PR)

If your PR changes something users notice, run:

```bash
npx changeset
```

Pick **patch** for a fix or **minor** for a new feature, and write one line about it. This adds a small file under `.changeset/`. Docs-only or CI-only PRs don't need one.

## Releasing (maintainers)

1. Merging PRs with changesets into `main` makes the **Version and release** workflow open a "chore: 새 버전 준비 (Version Packages)" PR. It bumps `package.json` and writes `CHANGELOG.md`.
2. Merging that PR tags the new version (`vX.Y.Z`). The tag starts **Release desktop app**, which builds the macOS and Windows installers and creates the GitHub Release from the CHANGELOG section.
3. npm: once Trusted Publishing is set up (below), the same workflow also publishes to npm. Until then, publish by hand with `npm publish --auth-type=web`.

One-time setup:

- **`CHANGESETS_TOKEN` secret.** Create a fine-grained personal access token for this repository only, with *Contents: Read and write* and *Pull requests: Read and write*, and save it under Settings → Secrets and variables → Actions. PRs and tags created with GitHub's default token don't start other workflows, so without it CI never runs on the version PR (and branch protection blocks the merge) and tags don't start the desktop build.
- **npm Trusted Publishing.** After the package exists on npm, open its settings on npmjs.com → *Trusted Publisher* → GitHub Actions, and enter owner `dioKR`, repository `what-are-my-agents-doing`, workflow `version.yml`. Then set the repository variable `NPM_TRUSTED_PUBLISHING` to `true`. No npm token is stored anywhere.
