import type { ServerMessage } from '../../../shared/protocol.ts';

export interface AgentSourceHandlers {
  onMessage(message: ServerMessage): void;
  onConnectionChange(connected: boolean): void;
}

/** 에이전트 상태를 흘려 주는 곳. 실제 서버(live)와 데모(demo)가 같은 모양을 따른다. 돌려준 함수를 부르면 멈춘다. */
export type AgentSource = (handlers: AgentSourceHandlers) => () => void;
