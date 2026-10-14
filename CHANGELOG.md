# Changelog

## 0.3.0

- **Records (trophy icon next to the gear).** See the records your agents have set: the most agents working at once, the longest and fastest task, and the longest-surviving agent, each with who set it, the request and when. It also shows all-time work (tasks finished, tool calls, time spent) and the most senior and newest agent in the office now. A task runs from your request to the end of the agent's reply; replies that used no tools are left out. Records are saved in `~/.wamad/records.json` and, like coins, only count while the app is running.
- CI now opens the page and the desktop app on Windows too, and installs the real Windows installer after each release to check that the app window shows the office.

## 0.2.2

- **Fixed: Windows showed "화면 파일이 없습니다" instead of the office.** The server turned `/` into `\` with Windows path rules, so it tried to open the folder instead of the home page. File paths in "doing now" also show with `/` on Windows now.
- **Fixed: renamed agents went back to the session title** (and custom looks or equipped shop items could come off) when an agent changed into a subfolder. Names are now remembered by the project folder the session started in.
- CI now also runs type check, unit tests and build on Windows.

## 0.2.1

- **New version notice in the desktop app.** Once a day it checks GitHub for the latest release. If there's a newer one, the menu bar icon shows "Get the new version" and a one-time dialog offers Download / Later / Skip this version. You can turn the check off or run it now from the menu.
- **npm package renamed to `what-are-my-agents-doing`** (npm refused `wamad` as too similar to an existing package). Run it with `npx what-are-my-agents-doing`; after `npm install -g what-are-my-agents-doing` the command is still `wamad`.
- If you installed the desktop app before 0.2.1, download the new version from the homepage once. From now on the app tells you about updates.

## 0.2.0

- **Dress-up shop.** Agents earn coins by working (finished turn +1, todo +3, team task +5, PR +10). Spend them on headwear (heart headband, sunglasses, cat ears, flower crown, party hat, Santa hat) and pets that follow their character (chick, slime, cat, dog). Coins pop up over the character when earned. The wallet is saved in `~/.wamad/wallet.json`.
- **npm-ready.** The server is bundled into plain JavaScript so it can run from an npm install (first published as 0.2.1).
- **Hidden ??? room.** Agents whose context passes 80% go dance under the disco ball.
- **Tests and CI.** Every PR runs a type check, unit tests (server, wallet rules, pixel art data), a build, and a browser smoke test in Chrome.
- Fixed: the yellow badge on the courier's mail cap was never drawn.

## 0.1.0

- First release: a pixel-art office that shows what your Claude Code agents are doing, hand-drawn characters, agent team meeting room, links, mail scenes, Korean/English UI.
- Desktop app for macOS and Windows with a menu bar icon and one-click Claude Code connection.
