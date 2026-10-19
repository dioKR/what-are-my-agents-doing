# Contributing

Thanks for helping! Issues and PRs are welcome, in English or Korean.

## Setup

```bash
npm install
npm run dev      # UI with hot reload (http://localhost:5173), /api is proxied to 4545
npm run server   # local server (4545) in another terminal
```

Node.js 23.6 or later runs the TypeScript sources directly.

## How we work: branches and PRs

We use a simple flow: **`main` is always releasable, and every change goes in through a pull request.**

1. **Big change? Open an issue first.** For a new feature or a large refactor, describe it in an issue so we can agree on the direction before you spend time on it. Small fixes can go straight to a PR.
2. **Branch from `main`** (or from `main` of your fork) with a short name that starts with the kind of change:

   | Prefix | For | Example |
   |---|---|---|
   | `feat/` | a new feature | `feat/records` |
   | `fix/` | a bug fix | `fix/windows-static-path` |
   | `docs/` | documentation only | `docs/contributing` |
   | `ci/` | GitHub Actions and checks | `ci/windows-app-check` |
   | `chore/` | tooling, dependencies, releases | `chore/changesets` |
   | `refactor/` | code changes that don't change behavior | `refactor/json-store` |

3. **Keep one PR to one change.** Small PRs get reviewed and merged faster. If you find an unrelated problem on the way, open a separate PR or issue.
4. **Open the PR against `main`** and fill in the template. Add a screenshot or GIF for anything visual.
5. **Merge when CI is green.** `main` is protected: nobody (maintainers included) can push to it directly, force-push it or delete it, and the `check` job must pass. PRs are **squash-merged**, so the PR title becomes the commit on `main`. Write the title as `type: what changed`, for example `fix: keep renamed agents after cd`.
6. **Releases are cut from `main` only**, by tagging `vX.Y.Z` (see "Releasing" below). An urgent fix follows the same flow on a `fix/` branch and ships as a patch version.

Long-lived branches (`develop`, `release/*`) are not used. Rebase or merge `main` into your branch if it falls behind; either is fine.

## Project layout

| Folder | What's inside |
|---|---|
| `server/` | Local server (127.0.0.1 only): reads hooks and transcripts, keeps agent state, wallet and records, serves the page |
| `shared/` | Types and rules both the server and the page use (protocol, shop, records). Change these and both sides change together |
| `web/` | The page: office map, pixel characters, panels, shop and records popups |
| `desktop/` | Electron app: tray menu, update notice, wraps the same server and page |
| `hooks/`, `scripts/` | The Claude Code hook script and its installer |
| `team/` | Agent team kit (role-based teammates) |
| `e2e/` | Browser and desktop app tests |

## Checks (CI runs these on every PR)

```bash
npm run typecheck
npm test                        # server logic, wallet rules, pixel art data
npm run build && npm run test:e2e   # opens the page in your installed Chrome and checks for errors
npm run build:server && npm run test:desktop   # opens the desktop app (macOS or Windows) and checks the window
```

CI also runs the browser and desktop app tests on Windows. If you are on a Mac, you can still see the Windows result: open the CI run and download the `windows-screens` artifact (a screenshot of the app window). If the browser test fails, CI keeps a screenshot as well.

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
