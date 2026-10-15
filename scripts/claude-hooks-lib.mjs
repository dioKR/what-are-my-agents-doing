// ~/.claude/settings.json 에 wamad 훅을 넣고 빼는 공용 코드. 명령줄(install-claude-hooks.mjs)과 데스크톱 앱이 함께 쓴다.
// 기존 훅은 건드리지 않고, 바꾸기 전에 settings.json.wamad-backup 으로 복사해 둔다.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PermissionRequest', 'Notification', 'Stop', 'SubagentStart', 'SubagentStop', 'PreCompact', 'SessionEnd', 'TeammateIdle', 'TaskCreated', 'TaskCompleted'];
const TOOL_EVENTS = new Set(['PreToolUse', 'PostToolUse', 'PermissionRequest']);
const EVENTS_PATH = '/api/events/claude';
/** 권한 질문 훅은 앱의 허용 · 거부를 기다린다 (서버는 최대 30초 기다리고, 훅은 그보다 조금 길게 둔다) */
const PERMISSION_PATH = '/api/permission/claude';
const PERMISSION_HOOK_TIMEOUT_SECONDS = 60;
/** 명령줄 훅을 알아보는 표시: 훅 스크립트 경로 (이름을 바꾸기 전 경로 포함). 데스크톱 앱 훅은 서버 주소로 알아본다 */
const SCRIPT_MARKERS = ['agent-office/hooks/claude-hook.mjs', 'what-are-my-agents-doing/hooks/claude-hook.mjs'];

export const claudeSettingsPath = () => join(homedir(), '.claude', 'settings.json');

/**
 * Node가 없는 컴퓨터(데스크톱 앱 사용자)를 위한 훅 명령: 받은 내용을 curl로 로컬 서버에 넘긴다.
 * 아무것도 출력하지 않고, 서버가 꺼져 있어도 1초 안에 성공으로 끝나 Claude Code를 막지 않는다.
 */
export const curlHookCommand = (port) =>
  `curl -s -o /dev/null --max-time 1 -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:${port}${EVENTS_PATH} || true`;

/** 권한 질문용 curl 훅: 서버의 대답(앱에서 누른 허용 · 거부 JSON, 없으면 빈 대답)을 그대로 출력한다 */
export const curlPermissionHookCommand = (port) =>
  `curl -s --max-time 40 -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:${port}${PERMISSION_PATH} || true`;

function isOurs(entry, extraMarkers) {
  return (entry.hooks ?? []).some((h) => {
    if (typeof h.command !== 'string') return false;
    const isCurlHook = h.command.includes('127.0.0.1:') && (h.command.includes(EVENTS_PATH) || h.command.includes(PERMISSION_PATH));
    return isCurlHook || [...SCRIPT_MARKERS, ...extraMarkers].some((marker) => h.command.includes(marker));
  });
}

async function readSettings() {
  try {
    return JSON.parse(await readFile(claudeSettingsPath(), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

/** 지금 settings.json 에 우리 훅이 들어 있는지 */
export async function hooksInstalled(extraMarkers = []) {
  const settings = await readSettings();
  return Object.values(settings.hooks ?? {}).some((entries) => entries.some((entry) => isOurs(entry, extraMarkers)));
}

/** 우리 훅이 들어 있지만 새 버전에서 늘어난 이벤트(예: PermissionRequest)가 빠져 있는지 */
export async function hooksOutdated(extraMarkers = []) {
  const settings = await readSettings();
  const hasOurs = (event) => (settings.hooks?.[event] ?? []).some((entry) => isOurs(entry, extraMarkers));
  return HOOK_EVENTS.some(hasOurs) && !HOOK_EVENTS.every(hasOurs);
}

/**
 * 우리 훅을 command로 바꿔 넣거나(uninstall이 아니면) 뺀다. dryRun이면 저장하지 않는다.
 * permissionCommand: 권한 질문(PermissionRequest)에 쓸 명령. 없으면 command를 쓴다 (Node 훅 스크립트는 하나로 둘 다 처리한다)
 * extraMarkers: 이 command 말고도 우리 훅으로 알아볼 문자열 (예: 지금 경로의 훅 스크립트)
 */
export async function updateClaudeHooks({ command, permissionCommand = command, uninstall = false, dryRun = false, extraMarkers = [] }) {
  const settings = await readSettings();
  settings.hooks ??= {};
  for (const event of HOOK_EVENTS) {
    const kept = (settings.hooks[event] ?? []).filter((entry) => !isOurs(entry, extraMarkers));
    const hook = event === 'PermissionRequest'
      ? { type: 'command', command: permissionCommand, timeout: PERMISSION_HOOK_TIMEOUT_SECONDS }
      : { type: 'command', command };
    const ours = { ...(TOOL_EVENTS.has(event) ? { matcher: '*' } : {}), hooks: [hook] };
    settings.hooks[event] = uninstall ? kept : [...kept, ours];
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }
  const output = JSON.stringify(settings, null, 2) + '\n';
  const path = claudeSettingsPath();
  if (!dryRun) {
    await copyFile(path, path + '.wamad-backup').catch(() => {});
    await writeFile(path, output);
  }
  return { path, backupPath: path + '.wamad-backup', output };
}
