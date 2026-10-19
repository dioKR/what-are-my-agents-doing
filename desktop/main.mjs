// 데스크톱 앱 (Electron). 비개발자도 설치 파일 하나로 쓸 수 있게 한다.
// - 앱 안에서 로컬 서버를 켜고, 그 화면을 창으로 띄운다 (Node 설치 필요 없음)
// - 메뉴 막대(트레이) 아이콘: 창 열기, Claude Code 연결(훅), 로그인할 때 자동 실행, 새 버전 알림, 종료
// - 창을 닫아도 꺼지지 않고 메뉴 막대에서 계속 돈다
import { app, BrowserWindow, Menu, Tray, dialog, nativeImage, shell } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from '../dist/server/app.mjs';
import { curlHookCommand, curlPermissionHookCommand, hooksInstalled, hooksOutdated, updateClaudeHooks } from '../scripts/claude-hooks-lib.mjs';
import { DOWNLOAD_PAGE, fetchLatestVersion, isNewer } from './updates.mjs';

const PORT = 4545;
const ko = app.getLocale().startsWith('ko');
const T = (koText, enText) => (ko ? koText : enText);
const APP_NAME = 'What Are My Agents Doing?';

/** 하루에 한 번 새 버전을 확인한다 */
const UPDATE_CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

let window = null;
/** 새 버전이 있으면 그 번호 (없으면 null) */
let newerVersion = null;
let tray = null;
let url = '';
let quitting = false;

// 앱 설정 (새 버전 확인 여부, 건너뛴 버전). 앱 데이터 폴더의 settings.json에 둔다
const settingsPath = () => join(app.getPath('userData'), 'settings.json');
function readSettings() {
  try { return { checkUpdates: true, skippedVersion: null, ...JSON.parse(readFileSync(settingsPath(), 'utf8')) }; }
  catch { return { checkUpdates: true, skippedVersion: null }; }
}
function saveSettings(patch) {
  try { writeFileSync(settingsPath(), JSON.stringify({ ...readSettings(), ...patch }, null, 2)); } catch { /* 못 쓰면 이번 실행에서만 바뀐다 */ }
}

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => showWindow());

/** 서버를 켠다. 이미 4545 포트에 wamad가 떠 있으면(명령줄로 켰을 때) 그 화면을 쓴다 */
async function ensureServer() {
  try {
    return (await startServer({ port: PORT, webRoot: join(app.getAppPath(), 'dist', 'web') })).url;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    const existing = `http://127.0.0.1:${PORT}`;
    const ok = await fetch(`${existing}/api/agents`).then((r) => r.ok, () => false);
    if (ok) return existing;
    throw new Error(T(`${PORT} 포트를 다른 프로그램이 쓰고 있어 켤 수 없습니다.`, `Port ${PORT} is used by another program.`));
  }
}

function showWindow() {
  if (!window) {
    window = new BrowserWindow({
      width: 1440, height: 920, minWidth: 900, minHeight: 600,
      title: APP_NAME, backgroundColor: '#1b1e23', autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, sandbox: true }
    });
    // 링크(PR, 로컬 서버)는 앱 안이 아니라 기본 브라우저로 연다
    window.webContents.setWindowOpenHandler(({ url: target }) => {
      if (/^https?:\/\//.test(target)) void shell.openExternal(target);
      return { action: 'deny' };
    });
    window.on('close', (event) => {
      if (quitting) return;
      event.preventDefault();
      window.hide();
    });
    void window.loadURL(url);
  }
  window.show();
  window.focus();
}

async function setHooks(install) {
  await updateClaudeHooks({ command: curlHookCommand(PORT), permissionCommand: curlPermissionHookCommand(PORT), uninstall: !install });
  await refreshTray();
  if (install) {
    await dialog.showMessageBox({
      type: 'info',
      message: T('Claude Code와 연결했습니다', 'Connected to Claude Code'),
      detail: T('이제 새로 시작하는 Claude Code 세션부터 승인 대기, 팀원 움직임까지 보입니다.\n이미 열려 있는 세션은 다시 시작해야 반영됩니다.', 'New Claude Code sessions will now also show permission prompts and teammates.\nRestart sessions that are already open.')
    });
  }
}

async function refreshTray() {
  const connected = await hooksInstalled();
  const autoStart = app.getLoginItemSettings().openAtLogin;
  const { checkUpdates } = readSettings();
  tray.setContextMenu(Menu.buildFromTemplate([
    ...(newerVersion ? [{ label: T(`새 버전 v${newerVersion} 받기 ✨`, `Get the new version v${newerVersion} ✨`), click: () => void shell.openExternal(DOWNLOAD_PAGE) }, { type: 'separator' }] : []),
    { label: T('화면 열기', 'Open'), click: showWindow },
    { type: 'separator' },
    connected
      ? { label: T('Claude Code 연결됨 ✓ (연결 끊기)', 'Connected to Claude Code ✓ (disconnect)'), click: () => void setHooks(false) }
      : { label: T('Claude Code와 연결하기…', 'Connect to Claude Code…'), click: () => void askToConnect() },
    { label: T('로그인할 때 자동으로 켜기', 'Open at login'), type: 'checkbox', checked: autoStart, click: (item) => { app.setLoginItemSettings({ openAtLogin: item.checked }); } },
    { label: T('새 버전 자동으로 확인', 'Check for new versions'), type: 'checkbox', checked: checkUpdates, click: (item) => { saveSettings({ checkUpdates: item.checked }); } },
    { label: T(`지금 확인 (현재 v${app.getVersion()})`, `Check now (current v${app.getVersion()})`), click: () => void checkForUpdate(true) },
    { type: 'separator' },
    { label: T('끄기', 'Quit'), click: () => { quitting = true; app.quit(); } }
  ]));
}

/**
 * GitHub에 최신 릴리스 번호만 물어본다. 새 버전이면 메뉴에 "새 버전 받기"를 띄우고, 한 번 알림 창을 연다.
 * manual: 메뉴에서 직접 눌렀을 때 (건너뛴 버전이어도 알려 주고, 최신이면 최신이라고 알려 준다)
 */
async function checkForUpdate(manual = false) {
  const settings = readSettings();
  if (!manual && !settings.checkUpdates) return;
  const latest = await fetchLatestVersion();
  if (!latest || !isNewer(latest, app.getVersion())) {
    if (manual) await dialog.showMessageBox({ type: 'info', message: latest ? T('최신 버전을 쓰고 있습니다', "You're up to date") : T('새 버전을 확인하지 못했습니다', "Couldn't check for updates"), detail: `v${app.getVersion()}` });
    return;
  }
  const firstTime = newerVersion !== latest;
  newerVersion = latest;
  await refreshTray();
  if (!manual && (!firstTime || settings.skippedVersion === latest)) return;
  const { response } = await dialog.showMessageBox({
    type: 'info',
    buttons: [T('다운로드', 'Download'), T('나중에', 'Later'), T('이 버전 건너뛰기', 'Skip this version')],
    defaultId: 0, cancelId: 1,
    message: T(`새 버전 v${latest}이 나왔습니다`, `Version v${latest} is available`),
    detail: T(`지금은 v${app.getVersion()}입니다. 홈페이지에서 새 설치 파일을 받아 덮어 설치하면 됩니다. 코인과 꾸민 모습은 그대로 남습니다.`, `You have v${app.getVersion()}. Download the new installer from the homepage and install it over this one. Your coins and looks stay.`)
  });
  if (response === 0) void shell.openExternal(DOWNLOAD_PAGE);
  if (response === 2) saveSettings({ skippedVersion: latest });
}

/** 훅은 ~/.claude/settings.json 을 바꾸므로 무엇을 하는지 설명하고 허락을 받는다 */
async function askToConnect() {
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: [T('연결하기', 'Connect'), T('나중에', 'Later')],
    defaultId: 0, cancelId: 1,
    message: T('Claude Code와 연결할까요?', 'Connect to Claude Code?'),
    detail: T(
      '연결하지 않아도 지금 일하는 세션은 보입니다. 연결하면 승인 대기, 하위 에이전트, 에이전트 팀원 움직임까지 보입니다.\n\nClaude Code 설정 파일(~/.claude/settings.json)에 훅을 추가하며, 기존 설정은 그대로 두고 바꾸기 전에 백업합니다. 메뉴 막대 아이콘에서 언제든 끊을 수 있습니다.',
      'Running sessions show up even without connecting. Connecting also shows permission prompts, subagents and agent teammates.\n\nThis adds hooks to the Claude Code settings file (~/.claude/settings.json). Existing settings are kept and backed up first. You can disconnect anytime from the menu bar icon.'
    )
  });
  if (response === 0) await setHooks(true);
}

app.whenReady().then(async () => {
  try {
    url = await ensureServer();
  } catch (error) {
    dialog.showErrorBox(APP_NAME, String(error.message ?? error));
    app.quit();
    return;
  }
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'desktop', 'trayIcon.png'));
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  tray.on('click', showWindow);
  await refreshTray();
  showWindow();
  // 예전 버전에서 연결한 훅에 새로 생긴 이벤트(권한 질문)를 더한다. 이미 연결을 허락한 우리 훅만 바꾼다
  if (await hooksOutdated()) await updateClaudeHooks({ command: curlHookCommand(PORT), permissionCommand: curlPermissionHookCommand(PORT) }).catch(() => {});
  if (!(await hooksInstalled())) await askToConnect();
  void checkForUpdate();
  setInterval(() => void checkForUpdate(), UPDATE_CHECK_EVERY_MS);
});

app.on('activate', showWindow);
app.on('before-quit', () => { quitting = true; });
// 창을 모두 닫아도 메뉴 막대에서 계속 돈다
app.on('window-all-closed', () => {});
