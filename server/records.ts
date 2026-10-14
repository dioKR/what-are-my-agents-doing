// 기록실 계산: 동시에 일한 에이전트 수, 가장 오래·빨리 끝난 작업, 가장 오래 살아 있던 에이전트, 누적 작업량.
// 계산은 순수 함수로 두고(테스트하기 쉽게), 파일 저장은 RecordsStore가 맡는다 (~/.wamad/records.json).
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Activity, AgentSnapshot } from '../shared/protocol.ts';
import { profileKey } from '../shared/profile.ts';
import { EMPTY_RECORDS, type RecordsState, type TimedRecord } from '../shared/records.ts';
import type { ClaudeHookPayload } from './claudeHook.ts';
import { cleanPrompt } from './humanize.ts';
import { JsonFileStore } from './jsonFileStore.ts';

const REQUEST_PREVIEW_LENGTH = 80;
/** 이 상태의 에이전트는 '일하는 중'으로 세지 않는다 */
const NOT_BUSY: ReadonlySet<Activity> = new Set(['waiting-user', 'ended']);

/** 기록·코인 내역에 남길 기본 이름: 세션 제목 → 팀원 이름 → 폴더 이름 */
export const whoOf = (agent: AgentSnapshot): string => agent.title ?? agent.memberName ?? agent.cwd.split(/[\\/]/).pop() ?? agent.id;

export const isBusy = (agent: AgentSnapshot): boolean => !NOT_BUSY.has(agent.activity);

const started = (state: RecordsState, at: number): RecordsState => (state.since === null ? { ...state, since: at } : state);

export function countToolCall(state: RecordsState, at: number): RecordsState {
  const next = started(state, at);
  return { ...next, totals: { ...next.totals, toolCalls: next.totals.toolCalls + 1 } };
}

/** 끝난 작업 하나를 누적에 더하고, 가장 오래·빨리 끝난 기록과 견준다 */
export function countTurn(state: RecordsState, turn: TimedRecord): RecordsState {
  const next = started(state, turn.at);
  return {
    ...next,
    totals: { ...next.totals, turns: next.totals.turns + 1, workMs: next.totals.workMs + turn.ms },
    longestTurn: !next.longestTurn || turn.ms > next.longestTurn.ms ? turn : next.longestTurn,
    fastestTurn: !next.fastestTurn || turn.ms < next.fastestTurn.ms ? turn : next.fastestTurn
  };
}

/** 지금 동시에 일하는 에이전트 수가 최고 기록을 넘으면 바꾼다 */
export function noteBusyCount(state: RecordsState, count: number, at: number): RecordsState {
  if (count === 0 || (state.peakBusy && count <= state.peakBusy.count)) return state;
  return { ...started(state, at), peakBusy: { count, at } };
}

/** 에이전트가 살아 있던 시간(시작 → 마지막 움직임)이 최고 기록을 넘으면 바꾼다 */
export function noteLifetime(state: RecordsState, agent: AgentSnapshot): RecordsState {
  const ms = agent.updatedAt - agent.startedAt;
  if (ms <= 0 || (state.longestLife && ms <= state.longestLife.ms)) return state;
  return { ...started(state, agent.updatedAt), longestLife: { who: whoOf(agent), nameKey: profileKey(agent), at: agent.updatedAt, ms, request: null } };
}

interface OpenTurn {
  startedAt: number;
  toolCalls: number;
  request: string | null;
}

/**
 * 작업 하나 = 요청을 받고(UserPromptSubmit) 끝낼 때까지(Stop). 에이전트마다 지금 하는 작업을 들고 있다가,
 * 끝나면 걸린 시간을 돌려준다. 도구를 한 번도 안 쓴 대답은 작업으로 세지 않는다.
 */
export class TurnTracker {
  private readonly open = new Map<string, OpenTurn>();

  /** 이 이벤트로 끝난 작업이 있으면 { ms, request }, 없으면 null */
  apply(key: string, event: ClaudeHookPayload, at: number): { ms: number; request: string | null } | null {
    switch (event.hook_event_name) {
      case 'UserPromptSubmit':
        this.open.set(key, { startedAt: at, toolCalls: 0, request: event.prompt ? cleanPrompt(event.prompt, REQUEST_PREVIEW_LENGTH) || null : null });
        return null;
      case 'PreToolUse': {
        const turn = this.open.get(key);
        if (turn) turn.toolCalls++;
        return null;
      }
      case 'Stop': {
        const turn = this.open.get(key);
        this.open.delete(key);
        if (!turn || turn.toolCalls === 0 || at <= turn.startedAt) return null;
        return { ms: at - turn.startedAt, request: turn.request };
      }
      case 'SessionEnd':
        this.open.delete(key);
        return null;
      default:
        return null;
    }
  }
}

/** 기록 파일 (~/.wamad/records.json) */
export class RecordsStore extends JsonFileStore<RecordsState> {
  constructor(path = join(homedir(), '.wamad', 'records.json')) {
    super(path, EMPTY_RECORDS);
  }
}
