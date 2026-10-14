// 꾸민 생김새 저장소. 이름과 같은 기준(도구 + 작업 폴더)으로 이 브라우저에 저장한다.
import type { AgentSnapshot } from '../../shared/protocol.ts';
import type { DollLook } from './office/character/doll.ts';
import { profileKey } from './names.ts';

const STORAGE_KEY = 'wamad.looks';
/** 이름을 바꾸기 전(Agent Office)에 저장한 값 */
const LEGACY_STORAGE_KEY = 'agent-office.looks';
let saved: Record<string, Partial<DollLook>> = readSaved();

function readSaved(): Record<string, Partial<DollLook>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? '{}') as Record<string, Partial<DollLook>>;
  } catch {
    return {};
  }
}

export function customLookOf(agent: AgentSnapshot): Partial<DollLook> | undefined {
  return saved[profileKey(agent)];
}

/** null을 주면 기본 생김새로 되돌린다 */
export function saveLook(agent: AgentSnapshot, look: Partial<DollLook> | null): void {
  const next = { ...saved };
  if (look) next[profileKey(agent)] = look;
  else delete next[profileKey(agent)];
  saved = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // 저장소를 못 쓰는 환경에서는 이번 창에서만 바뀐 모습을 쓴다
  }
}
