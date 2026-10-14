// 로컬 전용 서버. 훅이 보낸 기록을 받아 상태를 갱신하고, 화면에 실시간(SSE)으로 알린다.
// 127.0.0.1에만 열고, 밖으로는 아무것도 보내지 않는다.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION, SERVER_PORT, type AgentSnapshot, type ServerMessage } from '../shared/protocol.ts';
import { applyClaudeHook, isClaudeHookPayload, type ClaudeHookPayload } from './claudeHook.ts';
import { ACTIVE_WINDOW_MS, watchTranscripts } from './transcriptWatcher.ts';
import { routeEvent } from './team.ts';
import { readContextUsedRatio } from './transcript.ts';

const PORT = Number(process.env.WAMAD_PORT ?? process.env.AGENT_OFFICE_PORT ?? SERVER_PORT);
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024;
const ENDED_AGENT_LINGER_MS = 15_000;
const STALE_AGENT_MS = ACTIVE_WINDOW_MS;
const CONTEXT_REFRESH_MS = 2_000;
const WEB_ROOT = fileURLToPath(new URL('../dist/web/', import.meta.url));

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
  for (const event of events) {
    const route = routeEvent(event);
    if (!route) continue;
    if (source === 'hook') hookKeys.add(route.key);
    else if (hookKeys.has(route.key) && !TRANSCRIPT_ONLY_EVENTS.has(event.hook_event_name)) continue;
    // 팀원은 자기 기록 파일(대화 기록 쪽)로만 컨텍스트 사용량을 잰다. 훅이 주는 경로는 리더 것일 수 있다.
    if (event.transcript_path && (!route.member || source === 'transcript')) transcriptPaths.set(route.key, event.transcript_path);
    const prev = changed.get(route.key) ?? agents.get(route.key);
    const next = applyClaudeHook(prev, event, event.observed_at ?? now);
    changed.set(route.key, route.member
      ? { ...next, id: route.key, parentId: route.member.parentId, role: route.member.role ?? next.role, memberName: route.member.memberName ?? next.memberName }
      : next);
  }
  for (const next of changed.values()) {
    // 기록 파일은 최근에 바뀌었어도 마지막 실제 활동이 오래전이면 보여주지 않는다
    if (now - next.updatedAt > STALE_AGENT_MS) { remove(next.id); continue; }
    upsert(next);
    if (next.activity === 'ended') setTimeout(() => remove(next.id), ENDED_AGENT_LINGER_MS);
    void refreshContext(next.id, now);
  }
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
  listeners.add(res);
  req.on('close', () => listeners.delete(res));
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png'
};

async function serveStatic(pathname: string, res: ServerResponse): Promise<void> {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(WEB_ROOT, safe === '/' ? 'index.html' : safe);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('화면 파일이 없습니다. npm start 로 빌드한 뒤 실행하세요.');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}`);
  try {
    if (req.method === 'POST' && url.pathname === '/api/events/claude') {
      handleHookEvent(await readJsonBody(req));
      res.writeHead(204).end();
    } else if (req.method === 'GET' && url.pathname === '/api/stream') {
      openStream(req, res);
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
});

// 화면 연결이 끊기지 않게 주기적으로 빈 줄을 보내고, 오래 소식 없는 세션은 치운다.
setInterval(() => {
  for (const res of listeners) res.write(': ping\n\n');
  const now = Date.now();
  for (const agent of agents.values()) if (now - agent.updatedAt > STALE_AGENT_MS) remove(agent.id);
}, 15_000);

watchTranscripts((events) => applyEvents(events, 'transcript'));

server.listen(PORT, HOST, () => {
  console.log(`wamad (What Are My Agents Doing?): http://${HOST}:${PORT} 에서 화면을 볼 수 있습니다.`);
});
