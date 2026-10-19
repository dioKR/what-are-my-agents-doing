// 화면 쪽 허용 · 거부: 서버가 알려 준 권한 질문과 앱 설정을 들고 있고, 누른 대답을 서버에 보낸다.
import { DEFAULT_SETTINGS, type AppSettings, type ApprovalAsk, type ApprovalDecision } from '../../../shared/approvals.ts';

let asks: ApprovalAsk[] = [];
let settings: AppSettings = DEFAULT_SETTINGS;

export function setApprovalAsks(next: ApprovalAsk[]): void { asks = next; }
export function setAppSettings(next: AppSettings): void { settings = next; }
export const appSettings = (): AppSettings => settings;

/** 이 에이전트가 지금 앱의 대답을 기다리는 질문 (가장 먼저 물은 것) */
export const askOf = (agentId: string): ApprovalAsk | undefined => asks.find((a) => a.agentId === agentId);

export async function decide(id: string, decision: ApprovalDecision): Promise<boolean> {
  return post('/api/permission/decide', { id, decision });
}

export async function setApprovalsEnabled(enabled: boolean): Promise<boolean> {
  return post('/api/settings', { approvals: enabled });
}

async function post(path: string, body: unknown): Promise<boolean> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return res?.ok ?? false;
}
