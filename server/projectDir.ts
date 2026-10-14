// 에이전트의 프로젝트 폴더(세션을 시작한 폴더) 찾기.
// 에이전트는 일하다가 하위 폴더로 cd 하므로, 그 순간의 작업 폴더(cwd)는 바뀐다. 이름·꾸민 모습은 바뀌지 않는 프로젝트 폴더를 기준으로 기억해야 한다.
// Claude Code는 대화 기록을 ~/.claude/projects/<프로젝트 폴더 경로의 글자·숫자 외를 '-'로 바꾼 이름>/ 에 둔다.
// 그래서 cwd에서 위로 올라가며 그 이름과 같아지는 폴더를 찾으면 프로젝트 폴더다.
import { dirname } from 'node:path';

/** Claude Code가 대화 기록 폴더 이름을 만드는 방식 */
const encodeProjectPath = (path: string) => path.replace(/[^a-zA-Z0-9]/g, '-');

/** 대화 기록 파일 경로에서 프로젝트 폴더 이름(projects/ 바로 아래)을 꺼낸다 */
function projectFolderName(transcriptPath: string): string | null {
  const parts = transcriptPath.split(/[\\/]/);
  const index = parts.lastIndexOf('projects');
  return index >= 0 && parts[index + 1] ? parts[index + 1] : null;
}

/** 프로젝트 폴더. 대화 기록 경로가 없거나 맞는 폴더가 없으면 null */
export function projectDirOf(cwd: string | undefined, transcriptPath: string | undefined): string | null {
  if (!cwd || !transcriptPath) return null;
  const encoded = projectFolderName(transcriptPath);
  if (!encoded) return null;
  for (let dir = cwd; ; dir = dirname(dir)) {
    if (encodeProjectPath(dir) === encoded) return dir;
    if (dirname(dir) === dir) return null;
  }
}
