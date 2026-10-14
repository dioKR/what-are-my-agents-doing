// 에이전트가 남긴 글·명령 결과에서 사람이 눌러 볼 만한 링크를 뽑는다.
// PR 주소, 로컬 서버 주소(localhost), 그 밖의 웹 주소를 구분해 이름을 붙인다.
import type { AgentLink, LocalText } from '../shared/protocol.ts';

const localLabel = (port: string, path = ''): LocalText => ({ ko: `로컬 서버 :${port}${path}`, en: `Local server :${port}${path}` });
const same = (text: string): LocalText => ({ ko: text, en: text });

const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]}|]+/g;
const LOCAL_RE = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})(\/[^\s<>"'`)\]}|]*)?/g;
const TRAILING_PUNCTUATION = /[.,;:!?。、]+$/;
/** 내용 확인용으로 쓸모없는 주소 (예: 패키지 저장소의 스키마 주소) */
const IGNORED_HOSTS = new Set(['json.schemastore.org', 'www.w3.org', 'schemas.xmlsoap.org']);

export function extractLinks(text: string, at: number): AgentLink[] {
  if (!text) return [];
  const found = new Map<string, AgentLink>();
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    const link = describe(url, at);
    if (link) found.set(link.url, link);
  }
  for (const match of text.matchAll(LOCAL_RE)) {
    const url = `http://localhost:${match[1]}${(match[2] ?? '').replace(TRAILING_PUNCTUATION, '')}`;
    const alreadyAsUrl = [...found.keys()].some((u) => u.includes(`:${match[1]}`));
    if (!alreadyAsUrl) found.set(url, { url, label: localLabel(match[1]), kind: 'local', at });
  }
  return [...found.values()];
}

function describe(url: string, at: number): AgentLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (IGNORED_HOSTS.has(parsed.host)) return null;
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  if (isLocal) {
    const href = parsed.hostname === '0.0.0.0' ? url.replace('0.0.0.0', 'localhost') : url;
    return { url: href, label: localLabel(parsed.port || '80', parsed.pathname === '/' ? '' : parsed.pathname), kind: 'local', at };
  }
  const pr = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/(pull|merge_requests|-\/merge_requests)\/(\d+)/);
  if (pr) return { url, label: same(`PR #${pr[4]} · ${pr[2]}`), kind: 'pr', at };
  const issue = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (issue) return { url, label: { ko: `이슈 #${issue[3]} · ${issue[2]}`, en: `Issue #${issue[3]} · ${issue[2]}` }, kind: 'web', at };
  const path = parsed.pathname.length > 1 ? parsed.pathname.slice(0, 24) : '';
  return { url, label: same(`${parsed.host}${path}`), kind: 'web', at };
}
