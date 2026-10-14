import type { AgentSnapshot } from '../../../shared/protocol.ts';
import type { Look } from '../office/look.ts';

/** 패널들이 함께 쓰는 에이전트 한 명의 화면용 정보 */
export interface AgentView {
  agent: AgentSnapshot;
  name: string;
  look: Look | undefined;
  portrait: string | undefined;
}
