// 권한 질문을 들고 있다가 앱에서 대답하면 훅에 돌려준다. 시간이 지나거나 훅 연결이 끊기면 대답 없이(null) 끝낸다.
import { randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentSnapshot } from '../shared/protocol.ts';
import { DEFAULT_SETTINGS, type AppSettings, type ApprovalAsk, type ApprovalDecision } from '../shared/approvals.ts';
import { JsonFileStore } from './jsonFileStore.ts';

const DENY_MESSAGE = 'The user denied this in the What Are My Agents Doing? app.';

interface Waiting {
  ask: ApprovalAsk;
  answer: (decision: ApprovalDecision | null) => void;
}

export class ApprovalDesk {
  private readonly waiting = new Map<string, Waiting>();

  /** 지금 대답을 기다리는 질문들, 먼저 물은 것부터 */
  list(): ApprovalAsk[] {
    return [...this.waiting.values()].map((w) => w.ask).sort((a, b) => a.askedAt - b.askedAt);
  }

  /**
   * 질문을 올리고 대답을 기다린다. waitMs가 지나거나 cancel이 불리면 null.
   * onChange: 질문 목록이 바뀔 때(올릴 때 · 끝날 때) 부른다.
   */
  ask(fields: Omit<ApprovalAsk, 'id' | 'expiresAt'>, waitMs: number, onChange: () => void): { id: string; decision: Promise<ApprovalDecision | null>; cancel: () => void } {
    const id = randomBytes(6).toString('hex');
    let finish: (decision: ApprovalDecision | null) => void = () => {};
    const decision = new Promise<ApprovalDecision | null>((resolve) => {
      const timer = setTimeout(() => finish(null), waitMs);
      finish = (answer) => {
        if (!this.waiting.delete(id)) return;
        clearTimeout(timer);
        resolve(answer);
        onChange();
      };
    });
    this.waiting.set(id, { ask: { ...fields, id, expiresAt: fields.askedAt + waitMs }, answer: (answer) => finish(answer) });
    onChange();
    return { id, decision, cancel: () => finish(null) };
  }

  /** 앱에서 누른 대답. 이미 끝난 질문이면 false */
  decide(id: string, decision: ApprovalDecision): boolean {
    const waiting = this.waiting.get(id);
    if (!waiting) return false;
    waiting.answer(decision);
    return true;
  }
}

/** Claude Code의 PermissionRequest 훅이 읽는 대답 (https://code.claude.com/docs/en/hooks) */
export function permissionHookOutput(decision: ApprovalDecision): object {
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: decision === 'allow' ? { behavior: 'allow' } : { behavior: 'deny', message: DENY_MESSAGE }
    }
  };
}

/** 앱에서 대답한 뒤 캐릭터 상태: 허용하면 바로 일하고, 거부하면 다음 할 일을 생각한다 */
export function afterDecision(agent: AgentSnapshot, decision: ApprovalDecision): AgentSnapshot {
  if (agent.activity !== 'waiting-permission') return agent;
  return { ...agent, activity: decision === 'allow' ? 'working' : 'thinking' };
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * 이 컴퓨터의 우리 화면이 보낸 요청인지. 허용 · 거부와 설정 바꾸기처럼 위험한 요청에만 쓴다.
 * - Host: 다른 도메인을 127.0.0.1로 돌려 보내는 수법(DNS 리바인딩)을 막는다
 * - Origin: 다른 웹사이트가 몰래 보내는 요청을 막는다 (Origin이 없으면 브라우저가 아닌 요청)
 * - JSON만 받는다: 다른 사이트가 JSON을 보내려면 브라우저가 먼저 허락을 묻는데, 이 서버는 허락하지 않는다
 */
export function isTrustedPageRequest(req: IncomingMessage): boolean {
  const hostname = (value: string | undefined) => { try { return value ? new URL(value).hostname : null; } catch { return null; } };
  const host = hostname(`http://${req.headers.host ?? ''}`);
  const origin = req.headers.origin;
  return host !== null && LOOPBACK.has(host)
    && (origin === undefined || LOOPBACK.has(hostname(origin) ?? ''))
    && (req.headers['content-type'] ?? '').startsWith('application/json');
}

/** 앱 설정 파일 (~/.wamad/settings.json) */
export class SettingsStore extends JsonFileStore<AppSettings> {
  constructor(path = join(homedir(), '.wamad', 'settings.json')) {
    super(path, DEFAULT_SETTINGS);
  }
}
