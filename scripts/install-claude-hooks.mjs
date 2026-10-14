#!/usr/bin/env node
// ~/.claude/settings.json 에 wamad 훅을 추가하거나(기본) 뺀다(--uninstall).
// 기존 훅은 건드리지 않고, 바꾸기 전에 settings.json.wamad-backup 으로 복사해 둔다.
// --dry-run 을 붙이면 바뀔 내용만 보여 주고 저장하지 않는다.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStart', 'SubagentStop', 'PreCompact', 'SessionEnd', 'TeammateIdle', 'TaskCreated', 'TaskCompleted'];
const TOOL_EVENTS = new Set(['PreToolUse', 'PostToolUse']);

const settingsPath = join(homedir(), '.claude', 'settings.json');
const hookScript = fileURLToPath(new URL('../hooks/claude-hook.mjs', import.meta.url));
const command = `node "${hookScript}"`;
/** 이 저장소의 훅인지: 지금 경로의 훅 스크립트, 또는 이름을 바꾸기 전(agent-office) 경로로 설치된 훅 */
const OUR_HOOKS = [hookScript, 'agent-office/hooks/claude-hook.mjs'];
const uninstall = process.argv.includes('--uninstall');
const dryRun = process.argv.includes('--dry-run');

const isOurs = (entry) => (entry.hooks ?? []).some((h) => typeof h.command === 'string' && OUR_HOOKS.some((marker) => h.command.includes(marker)));

let settings = {};
try {
  settings = JSON.parse(await readFile(settingsPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
settings.hooks ??= {};

for (const event of EVENTS) {
  const kept = (settings.hooks[event] ?? []).filter((entry) => !isOurs(entry));
  const ours = { ...(TOOL_EVENTS.has(event) ? { matcher: '*' } : {}), hooks: [{ type: 'command', command }] };
  settings.hooks[event] = uninstall ? kept : [...kept, ours];
  if (settings.hooks[event].length === 0) delete settings.hooks[event];
}

const output = JSON.stringify(settings, null, 2) + '\n';
if (dryRun) {
  console.log(output);
  console.log(`(--dry-run: ${settingsPath} 에 저장하지 않았습니다)`);
} else {
  await copyFile(settingsPath, settingsPath + '.wamad-backup').catch(() => {});
  await writeFile(settingsPath, output);
  console.log(uninstall ? '훅을 뺐습니다.' : `훅을 추가했습니다: ${command}`);
  console.log(`백업: ${settingsPath}.wamad-backup`);
  console.log('이미 열려 있는 Claude Code 세션은 다시 시작해야 반영됩니다.');
}
