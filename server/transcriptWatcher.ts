// ~/.claude/projects 아래의 대화 기록 파일을 주기적으로 훑어, 새로 붙은 줄을 훅 이벤트로 바꿔 넘긴다.
// 이미 실행 중인 세션도 이 방법으로 보인다. 에이전트 팀원의 기록(<리더 세션>/subagents/agent-*.jsonl)도 함께 읽는다.
import { open, readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ClaudeHookPayload } from './claudeHook.ts';
import { TranscriptReader, type TeammateInfo } from './claudeTranscript.ts';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const SCAN_INTERVAL_MS = 2_000;
/** 이 시간 안에 기록이 바뀐 세션만 "지금 일하는 세션"으로 본다 */
export const ACTIVE_WINDOW_MS = 60 * 60_000;
/** 처음 붙을 때 현재 상태를 맞추려고 파일 끝에서 읽는 양 */
const BOOTSTRAP_TAIL_BYTES = 256 * 1024;
/** 팀원 기록은 첫 줄이 리더가 맡긴 일인데, 그 뒤에 붙는 안내 첨부가 커서 256KB 꼬리로는 첫 줄까지 닿지 않는다 */
const TEAMMATE_BOOTSTRAP_TAIL_BYTES = 4 * 1024 * 1024;

interface WatchedFile { reader: TranscriptReader; offset: number; carry: string }
interface Transcript { path: string; teammate: TeammateInfo | null }

/** onEvents는 파일 하나에서 새로 읽은 이벤트를 한 묶음으로 받는다 */
export function watchTranscripts(onEvents: (events: ClaudeHookPayload[]) => void): () => void {
  const files = new Map<string, WatchedFile>();
  let scanning = false;

  async function scan(): Promise<void> {
    if (scanning) return;
    scanning = true;
    try {
      for (const { path, teammate } of await listTranscripts()) {
        const info = await stat(path).catch(() => null);
        if (!info || Date.now() - info.mtimeMs > ACTIVE_WINDOW_MS) continue;
        const known = files.get(path);
        const watched = known ?? { reader: new TranscriptReader(path, teammate), offset: Math.max(0, info.size - (teammate ? TEAMMATE_BOOTSTRAP_TAIL_BYTES : BOOTSTRAP_TAIL_BYTES)), carry: '' };
        if (!known) files.set(path, watched);
        if (info.size <= watched.offset) continue;
        const lines = await readNewLines(path, watched, info.size, !known && watched.offset > 0);
        const events = lines.flatMap((line) => watched.reader.toHookEvents(line));
        if (events.length) onEvents(events);
      }
    } finally {
      scanning = false;
    }
  }

  void scan();
  const timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
  return () => clearInterval(timer);
}

/** 세션 기록과, 그 세션이 리더인 팀의 팀원 기록 */
async function listTranscripts(): Promise<Transcript[]> {
  const projects = await readdir(PROJECTS_DIR, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(projects.filter((d) => d.isDirectory()).map(async (dir) => {
    const projectDir = join(PROJECTS_DIR, dir.name);
    const entries = await readdir(projectDir, { withFileTypes: true }).catch(() => []);
    const sessions: Transcript[] = entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl')).map((e) => ({ path: join(projectDir, e.name), teammate: null }));
    const teammates = await Promise.all(entries.filter((e) => e.isDirectory()).map((e) => listTeammateTranscripts(join(projectDir, e.name, 'subagents'))));
    return [...sessions, ...teammates.flat()];
  }));
  return nested.flat();
}

/** 팀원 정보는 바뀌지 않으므로 meta.json은 파일마다 한 번만 읽는다 (보통 하위 에이전트는 null) */
const teammateByMeta = new Map<string, TeammateInfo | null>();

async function listTeammateTranscripts(subagentsDir: string): Promise<Transcript[]> {
  const entries = await readdir(subagentsDir).catch(() => [] as string[]);
  const found = await Promise.all(entries.filter((name) => name.endsWith('.jsonl')).map(async (name): Promise<Transcript[]> => {
    const path = join(subagentsDir, name);
    const teammate = await readTeammateMeta(path.replace(/\.jsonl$/, '.meta.json'));
    return teammate ? [{ path, teammate }] : [];
  }));
  return found.flat();
}

async function readTeammateMeta(metaPath: string): Promise<TeammateInfo | null> {
  if (teammateByMeta.has(metaPath)) return teammateByMeta.get(metaPath) ?? null;
  const meta = await readFile(metaPath, 'utf8').then((text) => JSON.parse(text) as Record<string, unknown>).catch(() => null);
  // 팀원 기록의 meta.json에는 팀 이름(teamName)과 팀원 이름(name)이 있다. 없으면 보통 하위 에이전트다.
  const isTeammate = meta && typeof meta.teamName === 'string' && typeof meta.name === 'string';
  const teammate = isTeammate ? { name: meta.name as string, agentType: typeof meta.agentType === 'string' ? meta.agentType : (meta.name as string) } : null;
  // 파일이 아직 덜 써졌을 수 있어, 읽기에 실패했을 때는 기억하지 않고 다음 번에 다시 읽는다
  if (meta) teammateByMeta.set(metaPath, teammate);
  return teammate;
}

/** offset부터 size까지 읽어 완성된 줄만 돌려준다. 끝이 잘린 줄은 다음 번에 이어 붙인다. */
async function readNewLines(path: string, watched: WatchedFile, size: number, skipFirstPartialLine: boolean): Promise<string[]> {
  const file = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(size - watched.offset);
    await file.read(buffer, 0, buffer.length, watched.offset);
    watched.offset = size;
    const lines = (watched.carry + buffer.toString('utf8')).split('\n');
    watched.carry = lines.pop() ?? '';
    return skipFirstPartialLine ? lines.slice(1) : lines;
  } finally {
    await file.close();
  }
}
