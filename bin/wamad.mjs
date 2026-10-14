#!/usr/bin/env node
// wamad (What Are My Agents Doing?) 명령. 화면 서버를 켜거나, 훅·팀 킷을 설치한다.
//   wamad                         화면 서버 켜기 (http://127.0.0.1:4545)
//   wamad hooks install|uninstall Claude Code 훅 설치·제거 (--dry-run: 바뀔 내용만 보기)
//   wamad team install <폴더>     역할별 팀원 정의를 프로젝트에 복사 (--force: 덮어쓰기)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [command = 'start', sub, ...rest] = process.argv.slice(2);
const run = (args, options = {}) => spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', ...options }).status ?? 1;
const script = (name) => fileURLToPath(new URL(`../scripts/${name}`, import.meta.url));

const HELP = `wamad — What Are My Agents Doing? (내 에이전트들은 뭘 하고 있을까?)

  wamad                          화면 서버 켜기 (http://127.0.0.1:4545)
  wamad hooks install [--dry-run]  Claude Code 훅 설치 (권한 승인 대기·팀원 움직임까지 보임)
  wamad hooks uninstall          훅 제거
  wamad team install <폴더> [--force]  역할별 팀원 정의(po·pm·design·fe·be·infra)를 프로젝트에 복사
  wamad help                     이 도움말`;

function start() {
  // 화면 파일이 없으면 먼저 만든다 (저장소를 막 받았을 때)
  if (!existsSync(fileURLToPath(new URL('../dist/web/index.html', import.meta.url)))) {
    const built = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }).status;
    if (built !== 0) return built ?? 1;
  }
  return run(['server/index.ts']);
}

let code;
if (command === 'start') code = start();
else if (command === 'hooks' && (sub === 'install' || sub === 'uninstall')) code = run([script('install-claude-hooks.mjs'), ...(sub === 'uninstall' ? ['--uninstall'] : []), ...rest]);
else if (command === 'team' && sub === 'install') code = run([script('install-team.mjs'), ...rest]);
else { console.log(HELP); code = command === 'help' || command === '--help' ? 0 : 1; }
process.exit(code);
