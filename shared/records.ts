// 기록실: 지금까지 에이전트들이 세운 기록. 서버가 계산해 ~/.wamad/records.json 에 두고, 화면은 트로피 창에서 보여 준다.

/** 기록을 세운 에이전트. 이름은 그때의 기본 이름(who)을 두고, 화면에서 바꾼 이름이 있으면 nameKey로 찾아 쓴다 */
export interface RecordHolder {
  who: string;
  /** 바꾼 이름·꾸민 모습을 기억하는 기준 (profileKey) */
  nameKey: string;
  /** 기록을 세운 시각 */
  at: number;
}

/** 시간으로 재는 기록 (작업 시간, 살아 있던 시간) */
export interface TimedRecord extends RecordHolder {
  ms: number;
  /** 작업 기록이면 그때 받은 요청 앞부분 */
  request: string | null;
}

export interface RecordsState {
  /** 처음 기록을 시작한 시각 (없으면 아직 아무 기록도 없다) */
  since: number | null;
  /** 동시에 일한 에이전트가 가장 많았던 순간 */
  peakBusy: { count: number; at: number } | null;
  /** 요청 하나를 받고 끝내기까지 가장 오래 걸린 작업 */
  longestTurn: TimedRecord | null;
  /** 도구를 한 번 이상 쓰고 가장 빨리 끝낸 작업 */
  fastestTurn: TimedRecord | null;
  /** 시작부터 마지막 움직임까지 가장 오래 살아 있던 에이전트 */
  longestLife: TimedRecord | null;
  /** 지금까지 끝낸 작업 수 · 도구를 쓴 횟수 · 작업에 걸린 시간 합 */
  totals: { turns: number; toolCalls: number; workMs: number };
}

export const EMPTY_RECORDS: RecordsState = {
  since: null,
  peakBusy: null,
  longestTurn: null,
  fastestTurn: null,
  longestLife: null,
  totals: { turns: 0, toolCalls: 0, workMs: 0 }
};
