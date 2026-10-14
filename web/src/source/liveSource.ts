// 로컬 서버(/api/stream)에 붙어 실제 에이전트 상태를 받는다. 끊기면 브라우저가 알아서 다시 붙는다.
import { PROTOCOL_VERSION, type ServerMessage } from '../../../shared/protocol.ts';
import type { AgentSource } from './agentSource.ts';

export const liveSource: AgentSource = ({ onMessage, onConnectionChange }) => {
  const stream = new EventSource('/api/stream');
  stream.onopen = () => onConnectionChange(true);
  stream.onerror = () => onConnectionChange(false);
  stream.onmessage = (event) => {
    let message: ServerMessage;
    try {
      message = JSON.parse(event.data) as ServerMessage;
    } catch {
      return; // 깨진 메시지는 버린다. 다음 메시지가 곧 온다.
    }
    // 서버가 새 판으로 다시 켜졌는데 이 창은 예전 화면이면, 글자가 [object Object]처럼 깨지므로 새로 받는다
    if (message.type === 'snapshot' && message.protocol !== PROTOCOL_VERSION) {
      stream.close();
      location.reload();
      return;
    }
    onMessage(message);
  };
  return () => stream.close();
};
