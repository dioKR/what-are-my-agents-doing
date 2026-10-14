// 로컬 전용 서버. 훅이 보낸 기록을 받아 상태를 갱신하고, 화면에 실시간(SSE)으로 알린다.
// 127.0.0.1에만 열고, 밖으로는 아무것도 보내지 않는다.
// 명령줄(server/index.ts)과 데스크톱 앱(desktop/main.mjs)이 startServer()로 같은 서버를 켠다. 한 프로세스에 하나만 켠다.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { PROTOCOL_VERSION, type AgentSnapshot, type ServerMessage } from '../shared/protocol.ts';
import type { RecordsState } from '../shared/records.ts';
import { applyClaudeHook, isClaudeHookPayload, type ClaudeHookPayload } from './claudeHook.ts';
import { ACTIVE_WINDOW_MS, watchTranscripts } from './transcriptWatcher.ts';
import { routeEvent } from './team.ts';
import { readContextUsedRatio } from './transcript.ts';
import { buy, earn, equip, rewardsFor, WalletStore, type ShopResult } from './wallet.ts';
import { staticFilePath } from './staticPath.ts';
import type { RewardReason, ShopSlot } from '../shared/shop.ts';
import { profileKey } from '../shared/profile.ts';
import { countToolCall, countTurn, isBusy, noteBusyCount, noteLifetime, RecordsStore, TurnTracker, whoOf } from './records.ts';

const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024;
const ENDED_AGENT_LINGER_MS = 15_000;
const STALE_AGENT_MS = ACTIVE_WINDOW_MS;
const CONTEXT_REFRESH_MS = 2_000;
/** 화면 파일(vite build 결과) 폴더. startServer()가 정한다 */
let webRoot = '';
const wallet = new WalletStore();
const records = new RecordsStore();
const turns = new TurnTracker();
/** 서버를 켠 시각. 이보다 앞선 기록(켤 때 몰아 읽는 지난 대화)으로는 코인을 주지 않고 작업 기록도 세지 않는다 (켤 때마다 두 번 세지 않게) */
let startedAt = Date.now();

const agents = new Map<string, AgentSnapshot>();
const transcriptPaths = new Map<string, string>();
const lastContextRead = new Map<string, number>();
const listeners = new Set<ServerResponse>();
/** 훅이 직접 들어오는 상태 키(세션 또는 팀원). 이 키는 대화 기록 쪽 이벤트를 무시해 같은 일이 두 번 잡히지 않게 한다. */
const hookKeys = new Set<string>();
/** 훅이 오는 키도 "에이전트가 남긴 설명 글"은 훅에 없어서 대화 기록에서만 가져온다 */
const TRANSCRIPT_ONLY_EVENTS = new Set(['AssistantText']);

function broadcast(message: ServerMessage): void {
  const line = `data: ${JSON.stringify(message)}\n\n`;
  for (const res of listeners) res.write(line);
}

function upsert(agent: AgentSnapshot): void {
  agents.set(agent.id, agent);
  broadcast({ type: 'agent', agent });
}

function remove(id: string): void {
  if (!agents.delete(id)) return;
  transcriptPaths.delete(id);
  lastContextRead.delete(id);
  broadcast({ type: 'removed', id });
}

async function refreshContext(id: string, now: number): Promise<void> {
  const path = transcriptPaths.get(id);
  if (!path || now - (lastContextRead.get(id) ?? 0) < CONTEXT_REFRESH_MS) return;
  lastContextRead.set(id, now);
  const ratio = await readContextUsedRatio(path);
  const current = agents.get(id);
  if (ratio !== null && current && ratio !== current.contextUsedRatio) upsert({ ...current, contextUsedRatio: ratio });
}

/** 이벤트를 순서대로 반영하고, 세션마다 마지막 상태만 한 번 알린다 (지난 기록을 몰아 읽을 때 화면이 장면을 연달아 틀지 않게) */
function applyEvents(events: ClaudeHookPayload[], source: 'hook' | 'transcript'): void {
  const now = Date.now();
  const changed = new Map<string, AgentSnapshot>();
  const rewards = new Map<string, RewardReason[]>();
  let nextRecords = records.state;
  let sawLiveEvent = false;
  for (const event of events) {
    const route = routeEvent(event);
    if (!route) continue;
    if (source === 'hook') hookKeys.add(route.key);
    else if (hookKeys.has(route.key) && !TRANSCRIPT_ONLY_EVENTS.has(event.hook_event_name)) continue;
    // 팀원은 자기 기록 파일(대화 기록 쪽)로만 컨텍스트 사용량을 잰다. 훅이 주는 경로는 리더 것일 수 있다.
    if (event.transcript_path && (!route.member || source === 'transcript')) transcriptPaths.set(route.key, event.transcript_path);
    const at = event.observed_at ?? now;
    const prev = changed.get(route.key) ?? agents.get(route.key);
    const next = applyClaudeHook(prev, event, at);
    changed.set(route.key, route.member
      ? { ...next, id: route.key, parentId: route.member.parentId, role: route.member.role ?? next.role, memberName: route.member.memberName ?? next.memberName }
      : next);
    if (at < startedAt) continue; // 켤 때 몰아 읽은 지난 대화로는 코인을 주지 않고 기록도 세지 않는다
    sawLiveEvent = true;
    rewards.set(route.key, [...(rewards.get(route.key) ?? []), ...rewardsFor(prev, next, event)]);
    nextRecords = recordWork(nextRecords, route.key, changed.get(route.key)!, event, at);
  }
  for (const next of changed.values()) {
    // 기록 파일은 최근에 바뀌었어도 마지막 실제 활동이 오래전이면 보여주지 않는다
    if (now - next.updatedAt > STALE_AGENT_MS) { remove(next.id); continue; }
    upsert(next);
    if (next.activity === 'ended') setTimeout(() => remove(next.id), ENDED_AGENT_LINGER_MS);
    void refreshContext(next.id, now);
  }
  for (const [id, reasons] of rewards) payCoins(id, reasons, now);
  setRecords(recordOffice(nextRecords, changed.values(), sawLiveEvent, now));
}

/** 작업 기록: 도구를 쓴 횟수, 끝난 작업의 걸린 시간 */
function recordWork(state: RecordsState, key: string, agent: AgentSnapshot, event: ClaudeHookPayload, at: number): RecordsState {
  let next = state;
  if (event.hook_event_name === 'PreToolUse') next = countToolCall(next, at);
  const finished = turns.apply(key, event, at);
  if (finished) next = countTurn(next, { ...finished, who: whoOf(agent), nameKey: profileKey(agent), at });
  return next;
}

/** 사무실 기록: 동시에 일한 에이전트 수, 가장 오래 살아 있던 에이전트 */
function recordOffice(state: RecordsState, changedAgents: Iterable<AgentSnapshot>, sawLiveEvent: boolean, now: number): RecordsState {
  // 켤 때 몰아 읽은 지난 대화의 마지막 상태는 지금 일하는 중인지 알 수 없어서, 실시간 이벤트가 있을 때만 센다
  let next = sawLiveEvent ? noteBusyCount(state, [...agents.values()].filter(isBusy).length, now) : state;
  for (const agent of changedAgents) next = noteLifetime(next, agent);
  return next;
}

/** 기록이 바뀌었으면 저장하고 화면에 알린다 */
function setRecords(next: RecordsState): void {
  if (next === records.state) return;
  records.set(next);
  broadcast({ type: 'records', records: next });
}

/** 번 코인을 지갑에 넣고, 화면에 지갑과 "+코인"을 알린다 */
function payCoins(agentId: string, reasons: RewardReason[], now: number): void {
  if (!reasons.length) return;
  const agent = agents.get(agentId);
  const who = agent ? whoOf(agent) : agentId;
  const result = earn(wallet.state, agentId, who, reasons, now);
  wallet.set(result.state);
  broadcast({ type: 'wallet', wallet: wallet.state });
  broadcast({ type: 'reward', agentId, amount: result.earned.reduce((sum, e) => sum + e.amount, 0) });
}

/** 상점 요청(사기·입히기)을 처리하고 결과를 돌려준다 */
function applyShopResult(result: ShopResult, res: ServerResponse): void {
  if (!result.ok) {
    res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: result.error }));
    return;
  }
  wallet.set(result.state);
  broadcast({ type: 'wallet', wallet: wallet.state });
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(wallet.state));
}

function handleHookEvent(body: unknown): void {
  if (!isClaudeHookPayload(body)) return;
  applyEvents([body], 'hook');
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function openStream(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify({ type: 'snapshot', protocol: PROTOCOL_VERSION, agents: [...agents.values()] } satisfies ServerMessage)}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'wallet', wallet: wallet.state } satisfies ServerMessage)}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'records', records: records.state } satisfies ServerMessage)}\n\n`);
  listeners.add(res);
  req.on('close', () => listeners.delete(res));
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png'
};

async function serveStatic(pathname: string, res: ServerResponse): Promise<void> {
  const file = staticFilePath(webRoot, pathname);
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('화면 파일이 없습니다. npm run build 로 화면을 만든 뒤 다시 켜세요.');
  }
}

const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', `http://${HOST}`);
  try {
    if (req.method === 'POST' && url.pathname === '/api/events/claude') {
      handleHookEvent(await readJsonBody(req));
      res.writeHead(204).end();
    } else if (req.method === 'GET' && url.pathname === '/api/stream') {
      openStream(req, res);
    } else if (req.method === 'POST' && url.pathname === '/api/shop/buy') {
      const body = (await readJsonBody(req)) as { itemId?: string };
      applyShopResult(buy(wallet.state, String(body.itemId ?? '')), res);
    } else if (req.method === 'POST' && url.pathname === '/api/shop/equip') {
      const body = (await readJsonBody(req)) as { key?: string; slot?: ShopSlot; itemId?: string | null };
      if (!body.key || (body.slot !== 'head' && body.slot !== 'pet')) { res.writeHead(400).end(); return; }
      applyShopResult(equip(wallet.state, body.key, body.slot, body.itemId ?? null), res);
    } else if (req.method === 'GET' && url.pathname === '/api/records') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(records.state));
    } else if (req.method === 'GET' && url.pathname === '/api/wallet') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(wallet.state));
    } else if (req.method === 'GET' && url.pathname === '/api/agents') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify([...agents.values()]));
    } else if (req.method === 'GET') {
      await serveStatic(url.pathname, res);
    } else {
      res.writeHead(405).end();
    }
  } catch {
    if (!res.headersSent) res.writeHead(400).end();
  }
};

export interface StartOptions {
  port: number;
  /** 화면 파일(vite build 결과) 폴더 */
  webRoot: string;
}

export interface RunningServer {
  /** 화면 주소 (예: http://127.0.0.1:4545) */
  url: string;
  /** 서버와 대화 기록 읽기를 멈춘다 (테스트에서 쓴다) */
  stop(): Promise<void>;
}

/**
 * 서버를 켜고 대화 기록 읽기를 시작한다.
 * 포트를 이미 다른 프로그램이 쓰고 있으면 실패한다 (error.code === 'EADDRINUSE').
 */
export async function startServer(options: StartOptions): Promise<RunningServer> {
  webRoot = options.webRoot;
  startedAt = Date.now();
  await wallet.load();
  await records.load();
  const server = createServer((req, res) => void handleRequest(req, res));
  return new Promise<RunningServer>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, HOST, () => {
      // 화면 연결이 끊기지 않게 주기적으로 빈 줄을 보내고, 오래 소식 없는 세션은 치운다.
      const sweep = setInterval(() => {
        for (const res of listeners) res.write(': ping\n\n');
        const now = Date.now();
        for (const agent of agents.values()) if (now - agent.updatedAt > STALE_AGENT_MS) remove(agent.id);
      }, 15_000);
      const stopWatching = watchTranscripts((events) => applyEvents(events, 'transcript'));
      const stop = () => new Promise<void>((done) => {
        clearInterval(sweep);
        stopWatching();
        for (const res of listeners) res.end();
        server.close(() => done());
      });
      // port를 0으로 주면 운영체제가 빈 포트를 고른다 (테스트용). 실제로 열린 포트로 주소를 만든다
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : options.port;
      resolve({ url: `http://${HOST}:${port}`, stop });
    });
  });
}
