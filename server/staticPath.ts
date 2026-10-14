// 화면 파일 경로 정하기. 주소(/, /assets/index.js)를 화면 폴더 안의 파일 경로로 바꾼다.
// 주소는 언제나 '/'로 나뉘므로 posix 규칙으로 정리한 뒤, 실제 파일 경로는 운영체제 규칙(path)으로 붙인다.
// (윈도우에서 path.normalize('/')는 '\'가 되어 "첫 화면" 판단이 틀렸던 적이 있다)
import nodePath from 'node:path';

type PathModule = Pick<typeof nodePath, 'join' | 'resolve' | 'sep'>;

/** 화면 폴더 안의 파일 경로. 화면 폴더 밖을 가리키면(../ 등) null */
export function staticFilePath(webRoot: string, pathname: string, path: PathModule = nodePath): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = nodePath.posix.normalize(decoded).replace(/^\/+/, '');
  if (relative === '' || relative === '.') return path.join(webRoot, 'index.html');
  const root = path.resolve(webRoot);
  const file = path.resolve(root, ...relative.split('/'));
  return file.startsWith(root + path.sep) ? file : null;
}
