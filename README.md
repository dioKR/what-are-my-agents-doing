# What Are My Agents Doing?

<p align="center"><img src="docs/images/dance.gif" width="420" alt="Agents whose context is more than 80% full dancing in the hidden ??? room"></p>
<p align="center"><sub>When an agent's context passes 80%, it sneaks off to the hidden <b>???</b> room to dance.</sub></p>

**A local dashboard that shows what the Claude Code agents on your machine are doing right now, as a pixel-art office you can take in at a glance.**

The command is **`wamad`**, from the initials.

[한국어](README.ko.md)

![What Are My Agents Doing?: agent characters working in the dev room, library, server room, nap room and meeting room](docs/images/overview.png)

When you run several agents in several terminal windows, it is easy to lose track of which one is doing what, and which one is waiting for your approval.
It turns each agent into a character and places it on an office map.

- Agents that are working type at a desk in the dev room.
- Agents searching the web walk to the library.
- Agents compacting their conversation take a nap in the nap room.

You can tell who is doing what at a glance.

- **Works right after install.** Claude Code sessions that were active in the last hour show up automatically, including ones that were already running.
- **Stays on your machine.** It listens on 127.0.0.1 only and sends nothing out.
- **Korean / English** UI.

---

## Quick start

Requires Node.js 23.6 or later, because it runs the TypeScript files directly without a build step.

```bash
git clone https://github.com/dioKR/what-are-my-agents-doing.git
cd what-are-my-agents-doing
npm install
npm link      # register the wamad command (once)
wamad
```

Open **http://127.0.0.1:4545** in your browser. `npm start` works too, without `npm link`.

Give Claude Code any task. Its character appears within a few seconds.

---

## What you see on the map

| What the agent is doing | Where the character goes |
|---|---|
| Reading or editing files, running commands | Types at a desk in the **dev room** |
| Web search, reading web pages | In front of the **library** shelves |
| Background commands (`run_in_background`) | **Server room** (the server lights blink faster) |
| Context more than 80% used (compaction coming) | Dances in the hidden **???** room above the meeting room (disco ball, dance floor) |
| Compacting a full context | Sleeps in the **nap room** |
| Waiting for you for a while (over 90 seconds) | Has a coffee in the **lounge** |
| Waiting for permission | `!` at the desk + an alert on the map |
| The same command failed 5 times in a row | Wanders around the dev room + a red alert |
| Sending or reading Slack/email through a tool | Walks to the **lobby mailbox**; a courier picks it up |
| Delegating to a subagent (Task) | A sprout-haired intern next to the desk |
| A todo list (TodoWrite) | Cards on the dev room board |
| Session ended | Leaves through the front door |

### Side panel

- The **details** panel shows the selected agent's:
  - task (your request)
  - current step (e.g. "Running tests") with the actual command
  - last thing it said
  - context usage
- **Links**: when an agent mentions a PR URL or a local server (`localhost:5173`, etc.), it shows up as a clickable link in the alerts and in the "Links" tab.
- There are five **tabs**: Activity · Team · Links · Mail · Todos.

### Settings (gear icon, top right)

- **Time of day** can be Now / Day / Evening / Night. "Now" follows your clock; at night the room lights, laptop screens and the street lamp turn on.
- **Language** can be Korean or English. It starts from your browser language and remembers your choice.

![Night view](docs/images/night.png)

---

## Characters

![The four default characters: pink-, white-, brown- and black-haired staffers](docs/images/characters.png)

There are four default characters. They are assigned in the order agents appear.

| Order | Name | Look |
|---|---|---|
| 1 | Pink-haired staffer | Long pink hair, heart eyes, blouse and ID badge |
| 2 | White-haired staffer | Fluffy white hair, amber eyes, shirt and tie, lanyard |
| 3 | Brown-haired staffer | Shaggy brown bangs over the eyes, headphones, a bandage on the cheek, gray hoodie |
| 4 | Black-haired staffer | Bob with red-dyed tips, red eyes, white tee with a name tag, silver earrings |

From the fifth agent on, the same four characters are reused with different hair and eye colors.

- **Customize**: click "Customize" in the details panel to choose the hair color, eyes, skin, outfit color and accessory. The character on the map changes as you pick, and the look is remembered when you save.
  - If you also change the hair style or outfit shape, the character switches from the hand-drawn art to the part-assembled drawing.
- **Rename**: the default name is the session title. Without a title, the folder name is used.
- Looks and names are remembered per "tool + working folder", so they stay the same when you restart Claude Code in the same folder.
- The four default characters are hand-placed 32×44 pixel art ([`web/src/office/character/sprites/`](web/src/office/character/sprites)).
  - The art is stored as character maps: one letter is one pixel, and each letter stands for a color, so hair and outfit colors can be swapped.
  - A frame is layered from a per-character head, a per-outfit torso, and arms and legs shared by everyone.
  - Directions: 4 (right is the mirrored left view)
  - Walk: 4-beat cycle
  - Poses: sit, type, think, raise hand, coffee, stretch, carry
  - Expressions: 6

---

## Team and meeting room

![The team gathered in the meeting room, with the Team tab](docs/images/team.png)

With Claude Code's experimental **agent teams** feature, the team gathers in the meeting room.
- The lead you talk to wears a **crown and sits in the CEO seat**.
- Teammates by role (PO · PM · Design · FE · BE · Infra) sit at the table.

| What happens | What you see |
|---|---|
| You give the lead an instruction | `CEO: …` above the lead; teammates turn toward the lead |
| Teammates message each other | A letter flies from sender to receiver, with a `→ FE: …` bubble |
| Team tasks are created or completed | The "Team" tab list and the progress bar on the meeting room monitor |
| A teammate searches the web | Walks to the library and back |
| A teammate gets work from the lead or another teammate | Leaves the meeting room to work (dev desk and so on); comes back when it is waiting again |

Each role has its own accessory.

| Role | Accessory |
|---|---|
| PO | Glasses |
| PM | Ribbon |
| Design | Beret |
| FE | Headphones |
| BE | Cap |
| Infra | Star pin |

### Starting a team

1. Copy the six role definitions into your project's `.claude/agents/`. Existing files with the same name are skipped; add `--force` to overwrite them.

   ```bash
   wamad team install /path/to/my-project
   ```

2. Install the hooks, because teammate activity is only visible through hooks. See "Installing hooks" below.

3. Start Claude Code in that project with agent teams turned on.

   ```bash
   CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
   ```

4. Tell the lead:

   > Create an agent team with one teammate each using the po, pm, design, fe, be and infra agent types. Have them wait in the meeting room for my instructions. When I give a north star metric, pass it to the whole team as-is instead of splitting it by role. Teammates divide the work by messaging each other and report back to me when done.

5. Give the team one north star metric, for example "raise first-week retention from 30% to 40%", not per-role instructions. The PO sets a goal and bets, and teammates claim their own work and hand off to each other by message.

The role definitions live in [`team/agents/`](team/agents). For example, BE writes the API contract first and tells FE, and FE reports the local server and PR URLs to the lead. You can edit the copies in your project.

> Agent teams is an experimental feature, and its event and message formats are only partly documented. This version follows the documented hook fields. If a real team looks different, please open an issue.

---

## Installing hooks (optional)

Without hooks, most states are read from Claude Code's transcripts (`~/.claude/projects/`). With hooks, you also see these three things:

- permission prompts
- subagent start and stop
- teammate events

```bash
wamad hooks install --dry-run   # preview the change only
wamad hooks install             # add hooks to ~/.claude/settings.json
wamad hooks uninstall           # remove them
```

Installing the hooks is designed to be safe:

- Your existing hooks are kept.
- `settings.json` is backed up to `settings.json.wamad-backup` before any change.
- The hook script ([`hooks/claude-hook.mjs`](hooks/claude-hook.mjs)) only forwards what it receives to the local server and prints nothing.
- It exits within 0.5 seconds even if the server is down, so it never blocks Claude Code.
- Hooks apply to Claude Code sessions started after installing.

---

## Privacy and security

- The server listens on **127.0.0.1 only**. Other machines on your network cannot reach it.
- Transcripts are **read only**. They are never changed or deleted.
- Nothing is sent out. The only internet request is for the UI fonts (Google Fonts).
- Sending results over Slack or email is done by the agents with their own tools. This tool only shows that it happened.

---

## Troubleshooting

**No agents show up**
- Only sessions active in the last hour are shown. Give Claude Code a task.
- Make sure the server is running. The top right should say "Connected".

**Text shows up as `[object Object]`**
- This happens when the server was restarted with a new version but the browser tab still runs the old page. Reload the tab.
- From this version on, the page reloads itself when its version doesn't match the server.

**Port 4545 is already in use**
- Change it with the `WAMAD_PORT` environment variable. The hook reads the same variable.

```bash
WAMAD_PORT=4600 wamad
```

**Permission prompts don't show up**
- Permission prompts are only visible through hooks. Install them with `wamad hooks install`.

---

## Development

```bash
npm run server      # local server (4545)
npm run dev         # UI dev server (Vite); /api is proxied to 4545
npm test            # server tests
npm run typecheck
```

- Every character combination: run `npm run dev`, then open http://localhost:5173/dev/dolls.html
- The four default characters: http://localhost:5173/dev/cast.html

### Layout

```
shared/protocol.ts        State shape shared by server and UI (AgentSnapshot)
server/
  index.ts                127.0.0.1-only HTTP server + live updates (SSE)
  claudeHook.ts           hook event → agent state (pure function)
  claudeTranscript.ts     transcript line → hook-shaped events
  transcriptWatcher.ts    tails ~/.claude/projects transcripts every 2 seconds
  humanize.ts             tool call → Korean/English sentence like "Running tests"
  links.ts                finds PR URLs and local server URLs
  team.ts                 splits team events into lead and teammate states
hooks/claude-hook.mjs     the hook Claude Code runs; it only forwards to the server
team/agents/              role definitions (po, pm, design, fe, be, infra)
web/src/
  office/                 map, furniture, lighting, movement (actors), drawing (renderer), map text (labels)
  office/character/       character drawing (doll); sprites/ holds the hand-placed pixel art (heads, torsos, arms, legs, accessories)
  panels/                 cards, alerts, details, tabs, customizer, settings
  i18n.ts                 UI language (Korean/English)
```

---

## Roadmap

- Match the real agent teams event and message formats by running an actual team
- Codex CLI and Gemini CLI support (the state shape is tool-agnostic; each tool needs a transcript reader)
- Swappable themes (other office maps, other character sets)
- Usage limit display
