// 에이전트의 작업 폴더를 Finder · 탐색기 · 파일 관리자로 연다.
// 폴더 경로는 요청에서 받지 않고 에이전트 상태(projectDir · cwd)에서만 가져온다.
import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';

/** 운영체제마다 폴더를 여는 프로그램 */
export function folderOpener(platform: NodeJS.Platform): string {
  if (platform === 'darwin') return 'open';
  if (platform === 'win32') return 'explorer.exe';
  return 'xdg-open';
}

/** 폴더가 있으면 열고 true, 없으면 false. 셸을 거치지 않고(execFile) 경로를 인자 하나로 넘긴다 */
export async function openFolder(dir: string): Promise<boolean> {
  const isDir = await stat(dir).then((s) => s.isDirectory(), () => false);
  if (!isDir) return false;
  execFile(folderOpener(process.platform), [dir], () => {
    // explorer.exe는 성공해도 1로 끝나는 일이 있어 결과는 보지 않는다
  });
  return true;
}
