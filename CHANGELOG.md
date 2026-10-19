# Changelog

## 0.5.0

### Minor Changes

- 1dbfe74: **Four new expressions.** Characters cry after you deny them in the app or after failing 2–4 times in a row, look surprised while asking for permission, get star eyes after earning 5+ coins at once (PR, git push, team task), and look worn out at 70–80% context.
- fefbb7a: **Zoom and move the map.** Pinch on a trackpad or Ctrl (⌘) + mouse wheel to zoom in on the spot you point at (up to 3×), drag to move around, or use the zoom in / zoom out / whole map buttons at the bottom right. Name tags and speech bubbles keep their size.
- dc482c0: **Coins for `git push`.** Agents earn +5 coins when a `git push` they run succeeds, for those who push without opening PRs. Failed pushes and `--dry-run` don't count (#19).

### Patch Changes

- c94e42c: Releases are now prepared with Changesets: each PR leaves a short note, and a "Version Packages" PR bumps the version and updates this changelog.
- ae27a61: Fixed: on Windows, selecting the second or third agent made the screen shake. The scrollbar kept appearing and disappearing and changed the page width; its space is now always reserved (#20).

## 0.4.0

- **Allow or deny permission prompts from the app.** Turn on "Answer permission prompts here" in the settings (off by default). When Claude Code asks to run a tool, the agent's details show what it wants to run with Allow and Deny. Claude Code waits up to 30 seconds for your answer, then asks in the terminal as usual. Only the page served on this computer can answer. The desktop app adds the new hook by itself; if you use the `wamad` command, run `wamad hooks install` once again.
- **Right-click menu** on characters and cards: allow / deny, rename, customize, open work folder, open latest link, and send out of the office (hides it until it works again).
- **Your own character from a PNG sheet.** In Customize, download the template, paint over it and upload it. Sheets are saved in `~/.wamad/characters/`.
- **Jellyfish dance** in the ??? room: arms spread out, rippling left and right. Dancers switch between the disco and the jellyfish every 8 seconds.
- The nap room is now labeled "Compacting context" (Korean: 컨텍스트 정리) instead of "conversation summary".
- Fixed: the desktop app's empty office suggested a terminal command for connecting hooks. It now points to the app icon menu.

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
