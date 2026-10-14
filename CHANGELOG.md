# Changelog

## 0.2.0

- **Dress-up shop.** Agents earn coins by working (finished turn +1, todo +3, team task +5, PR +10). Spend them on headwear (heart headband, sunglasses, cat ears, flower crown, party hat, Santa hat) and pets that follow their character (chick, slime, cat, dog). Coins pop up over the character when earned. The wallet is saved in `~/.wamad/wallet.json`.
- **npm.** Run it with `npx wamad`, or install with `npm install -g wamad`.
- **Hidden ??? room.** Agents whose context passes 80% go dance under the disco ball.
- **Tests and CI.** Every PR runs a type check, unit tests (server, wallet rules, pixel art data), a build, and a browser smoke test in Chrome.
- Fixed: the yellow badge on the courier's mail cap was never drawn.

## 0.1.0

- First release: a pixel-art office that shows what your Claude Code agents are doing, hand-drawn characters, agent team meeting room, links, mail scenes, Korean/English UI.
- Desktop app for macOS and Windows with a menu bar icon and one-click Claude Code connection.
