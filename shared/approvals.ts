// 앱에서 허용 · 거부: Claude Code가 도구 권한을 물으면(PermissionRequest 훅) 훅이 앱의 대답을 잠깐 기다린다.
// 앱에서 누르면 그 대답이 Claude Code로 가고, 시간 안에 대답이 없으면 평소처럼 터미널에서 묻는다.

/** 훅이 앱의 대답을 기다리는 최대 시간. 지나면 터미널 승인 창으로 넘어간다 */
export const APPROVAL_WAIT_MS = 30_000;

export type ApprovalDecision = 'allow' | 'deny';

/** 앱에 띄울 권한 질문 하나 */
export interface ApprovalAsk {
  id: string;
  /** 물어본 에이전트 (지도 캐릭터 id) */
  agentId: string;
  toolName: string;
  /** 무엇을 하려는지 짧게. 예: "Bash npm test" */
  detail: string;
  askedAt: number;
  /** 이 시각까지 대답이 없으면 터미널로 넘어간다 */
  expiresAt: number;
}

/** 앱 설정 (~/.wamad/settings.json) */
export interface AppSettings {
  /** 앱에서 허용 · 거부하기. 끄면 훅이 기다리지 않고 바로 터미널에서 묻는다 */
  approvals: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = { approvals: false };
