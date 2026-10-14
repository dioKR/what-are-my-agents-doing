#!/usr/bin/env node
// 역할별 팀원 정의(team/agents/*.md)를 프로젝트의 .claude/agents/ 로 복사하고, 팀을 시작하는 방법을 안내한다.
// 사용법: npm run team:install -- <프로젝트 폴더>   (이미 같은 이름 파일이 있으면 건너뛴다. 덮어쓰려면 --force)
import { copyFile, mkdir, readdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const force = args.includes('--force');
const target = args.find((a) => !a.startsWith('--'));
if (!target) {
  console.log('사용법: npm run team:install -- <프로젝트 폴더> [--force]');
  process.exit(1);
}

// 경로를 잘못 적었을 때 엉뚱한 빈 폴더가 생기지 않도록, 프로젝트 폴더는 이미 있어야 한다
const projectDir = resolve(target);
if (!(await access(projectDir).then(() => true, () => false))) {
  console.log(`프로젝트 폴더가 없습니다: ${projectDir}\n실제 프로젝트 폴더 경로를 적어 주세요.`);
  process.exit(1);
}

const sourceDir = fileURLToPath(new URL('../team/agents/', import.meta.url));
const destDir = join(projectDir, '.claude', 'agents');
await mkdir(destDir, { recursive: true });

const roles = [];
for (const file of (await readdir(sourceDir)).filter((f) => f.endsWith('.md'))) {
  const dest = join(destDir, file);
  const exists = await access(dest).then(() => true, () => false);
  if (exists && !force) { console.log(`건너뜀 (이미 있음): ${dest}`); continue; }
  await copyFile(join(sourceDir, file), dest);
  roles.push(file.replace(/\.md$/, ''));
  console.log(`복사함: ${dest}`);
}

console.log(`
다음 단계
1) 에이전트 팀 기능 켜기 (실험 기능): 그 프로젝트에서 Claude Code를 이렇게 시작합니다.
   CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
2) wamad 훅이 설치되어 있어야 팀원 움직임이 보입니다: wamad hooks install (또는 npm run hooks:install)
3) 리더(지금 대화하는 Claude)에게 이렇게 말합니다.
   "에이전트 팀을 꾸려줘. po, pm, design, fe, be, infra 에이전트 타입으로 팀원을 하나씩 만들고,
    모두 회의실에 모여 내 지시를 기다리게 해. 내가 북극성 지표를 주면 역할별로 나누지 말고 팀 전체에 그대로 전달해.
    일은 팀원들이 서로 메시지로 나눠 맡고, 끝나면 나에게 보고해."
   (English) "Create an agent team with one teammate each using the po, pm, design, fe, be and infra agent types.
    Have them wait in the meeting room for my instructions. When I give a north star metric, pass it to the whole team
    as-is instead of splitting it by role. Teammates divide the work by messaging each other and report back to me."
4) 할 일은 북극성 지표 하나로 줍니다 (예: "첫 주 리텐션을 30%에서 40%로"). 팀원들이 각자 맡을 일을 고릅니다.
`);
