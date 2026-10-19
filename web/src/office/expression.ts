// 캐릭터 표정 고르기. 위에 있는 것이 먼저다 (춤출 때는 늘 웃고, 막혔으면 당황 …).
import type { AgentSnapshot } from '../../../shared/protocol.ts';
import type { Expression } from './character/doll.ts';

/** 앱에서 거부당한 뒤 이만큼 운다 */
export const CRY_AFTER_DENIAL_MS = 6_000;
/** 같은 실패가 이 횟수부터 울기 시작한다 (STUCK_FAIL_STREAK부터는 당황) */
const CRY_FAIL_STREAK = 2;
/** 컨텍스트가 이만큼 차면 지친 얼굴. ??? 방(80%)에 가기 전까지 */
const TIRED_CONTEXT_RATIO = 0.7;

/** 표정을 정하는 데 쓰는 캐릭터 상태 */
export interface FaceState {
  isDancing: boolean;
  isSeated: boolean;
  /** 턴을 마쳐 기뻐하는 남은 시간(초) */
  cheerLeft: number;
  /** 코인을 많이 벌어(PR · push · 팀 할 일) 뿌듯해하는 남은 시간(초) */
  proudLeft: number;
}

/** 깜빡임은 부르는 쪽에서 평소 · 집중 · 지친 얼굴에만 덧입힌다 */
export function expressionOf(face: FaceState, agent: AgentSnapshot | undefined, now: number): Expression {
  if (face.isDancing) return 'happy';
  if (!agent) return 'normal';
  if (agent.activity === 'stuck') return 'panic';
  const deniedRecently = agent.deniedAt !== undefined && now - agent.deniedAt < CRY_AFTER_DENIAL_MS;
  if (deniedRecently || agent.failStreak >= CRY_FAIL_STREAK) return 'cry';
  if (agent.activity === 'waiting-permission') return 'surprised';
  if (face.proudLeft > 0) return 'proud';
  if (face.cheerLeft > 0) return 'happy';
  if ((agent.contextUsedRatio ?? 0) >= TIRED_CONTEXT_RATIO) return 'tired';
  if (agent.activity === 'working' && face.isSeated) return 'focus';
  return 'normal';
}
