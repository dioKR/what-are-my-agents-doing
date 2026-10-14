import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPrompt, firstParagraph, humanizeCommand, humanizeTool, messageSent } from './humanize.ts';

test('파일 도구는 무엇을 하는지 사람 말로', () => {
  assert.equal(humanizeTool('Edit', { file_path: '/repo/src/app.ts' }, '/repo').ko, 'src/app.ts 고치는 중');
  assert.equal(humanizeTool('Read', { file_path: '/elsewhere/a.md' }, '/repo').en, 'Reading a.md');
  assert.equal(humanizeTool('WebSearch', { query: 'Stripe 실패 코드' }, '/repo').ko, "웹에서 'Stripe 실패 코드' 검색 중");
  assert.equal(humanizeTool('mcp__slack__post_message', {}, '/repo').en, 'Using slack (post_message)');
});

test('명령은 종류를 짐작하고, 모르면 Claude가 단 설명을 쓴다', () => {
  assert.deepEqual(humanizeCommand('npm test -- --watch=false'), { ko: '테스트 돌리는 중', en: 'Running tests' });
  assert.equal(humanizeCommand('git commit -m "x"').ko, 'git 커밋하는 중');
  assert.equal(humanizeCommand('python3 analyze.py', '리텐션 지표 계산').ko, '리텐션 지표 계산');
  assert.equal(humanizeCommand('python3 analyze.py').en, 'Running: python3 analyze.py');
});

test('요청과 설명 글은 짧게 한 줄로', () => {
  assert.equal(cleanPrompt('  A/B 테스트\n설계해줘 <system-reminder>무시</system-reminder> '), 'A/B 테스트 설계해줘');
  assert.equal(firstParagraph('## 먼저 서버를 고치겠습니다.\n\n그다음 화면을 봅니다.'), '먼저 서버를 고치겠습니다.');
});

test('팀 전체에게 보내는 메시지는 * 대신 "팀 전체"로', () => {
  assert.equal(messageSent('*').ko, '팀 전체에게 메시지 보내는 중');
  assert.equal(messageSent('fe').en, 'Messaging fe');
});
