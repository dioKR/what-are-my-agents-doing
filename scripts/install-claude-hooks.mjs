#!/usr/bin/env node
// ~/.claude/settings.json 에 wamad 훅을 추가하거나(기본) 뺀다(--uninstall). --dry-run 이면 바뀔 내용만 보여 준다.
// - 저장소에서 실행하면: Node로 훅 스크립트(hooks/claude-hook.mjs)를 실행하게 한다
// - npm 패키지(npx wamad)로 실행하면: 패키지 위치는 바뀌거나 지워질 수 있어(npx 임시 폴더), 파일 경로가 필요 없는 curl 훅을 쓴다
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { curlHookCommand, updateClaudeHooks } from './claude-hooks-lib.mjs';

const DEFAULT_PORT = 4545;
const hookScript = fileURLToPath(new URL('../hooks/claude-hook.mjs', import.meta.url));
const fromSource = existsSync(fileURLToPath(new URL('../server/index.ts', import.meta.url)));
const port = Number(process.env.WAMAD_PORT ?? DEFAULT_PORT);
const command = fromSource ? `node "${hookScript}"` : curlHookCommand(port);
const uninstall = process.argv.includes('--uninstall');
const dryRun = process.argv.includes('--dry-run');

const result = await updateClaudeHooks({ command, uninstall, dryRun, extraMarkers: [hookScript] });
if (dryRun) {
  console.log(result.output);
  console.log(`(--dry-run: ${result.path} 에 저장하지 않았습니다)`);
} else {
  console.log(uninstall ? '훅을 뺐습니다.' : `훅을 추가했습니다: ${command}`);
  console.log(`백업: ${result.backupPath}`);
  console.log('이미 열려 있는 Claude Code 세션은 다시 시작해야 반영됩니다.');
}
