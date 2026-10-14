// 새 버전 알림: GitHub의 최신 릴리스 번호만 물어보고, 지금 앱보다 새것이면 알려 준다.
// 서명하지 않은 맥 앱은 스스로 업데이트할 수 없어서, 내려받는 곳(홈페이지)으로 안내한다.
// 내 정보는 보내지 않는다. 메뉴에서 끌 수 있다.
export const LATEST_RELEASE_API = 'https://api.github.com/repos/dioKR/what-are-my-agents-doing/releases/latest';
export const DOWNLOAD_PAGE = 'https://dioKR.github.io/what-are-my-agents-doing/';

/** "v0.10.1" 같은 버전을 [0, 10, 1]로. 숫자가 아니면 null */
export function parseVersion(text) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(text ?? '').trim());
  return match ? match.slice(1, 4).map(Number) : null;
}

/** latest가 current보다 새 버전이면 true (형식이 이상하면 false) */
export function isNewer(latest, current) {
  const a = parseVersion(latest), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** 최신 릴리스 번호 (예: "0.3.0"). 인터넷이 없거나 실패하면 null */
export async function fetchLatestVersion(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const { tag_name: tag } = await res.json();
    return parseVersion(tag) ? String(tag).replace(/^v/, '') : null;
  } catch {
    return null;
  }
}
