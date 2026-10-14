import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectDirOf } from './projectDir.ts';

const transcript = '/Users/yh/.claude/projects/-Users-yh-Workspace-my-app/abc.jsonl';

test('하위 폴더로 cd 해도 대화 기록 폴더 이름으로 프로젝트 폴더를 찾는다', () => {
  assert.equal(projectDirOf('/Users/yh/Workspace/my-app', transcript), '/Users/yh/Workspace/my-app');
  assert.equal(projectDirOf('/Users/yh/Workspace/my-app/packages/web', transcript), '/Users/yh/Workspace/my-app');
  // 점이나 밑줄이 들어간 폴더 이름도 '-'로 바뀌어 저장된다
  assert.equal(projectDirOf('/Users/yh/my.app_v2/src', '/h/.claude/projects/-Users-yh-my-app-v2/s.jsonl'), '/Users/yh/my.app_v2');
});

test('팀원 기록(<세션>/subagents/...)도 같은 프로젝트 폴더를 찾고, 단서가 없으면 null', () => {
  assert.equal(projectDirOf('/Users/yh/Workspace/my-app/api', '/Users/yh/.claude/projects/-Users-yh-Workspace-my-app/s1/subagents/agent-a.jsonl'), '/Users/yh/Workspace/my-app');
  assert.equal(projectDirOf('/elsewhere', transcript), null);
  assert.equal(projectDirOf('/Users/yh/Workspace/my-app', undefined), null);
});
