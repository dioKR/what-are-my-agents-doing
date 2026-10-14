// 화면에 보여 줄 짧은 파일 경로: 작업 폴더 안이면 상대 경로(src/a.ts), 밖이면 파일 이름만.
// 운영체제와 상관없이 같은 모양으로 보이도록 구분자는 언제나 '/'로 쓴다 (윈도우의 '\'도 '/'로).
import nodePath from 'node:path';

type PathModule = Pick<typeof nodePath, 'isAbsolute' | 'relative' | 'basename' | 'sep'>;

/** maxLength보다 긴 상대 경로는 파일 이름만 보인다 */
export function shortPath(filePath: string, cwd: string, maxLength = Infinity, path: PathModule = nodePath): string {
  if (cwd && path.isAbsolute(filePath)) {
    const rel = path.relative(cwd, filePath);
    // 다른 드라이브(윈도우)면 relative가 절대 경로를 돌려준다
    const insideCwd = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    if (insideCwd && rel.length <= maxLength) return rel.split(path.sep).join('/');
  }
  return path.basename(filePath);
}
