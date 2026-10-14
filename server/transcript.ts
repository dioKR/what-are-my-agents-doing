// Claude Code 대화 기록(JSONL)의 끝부분에서 마지막 토큰 사용량을 읽어 컨텍스트가 얼마나 찼는지 계산한다.
import { open } from 'node:fs/promises';

const TAIL_BYTES = 256 * 1024;
const STANDARD_WINDOW = 200_000;
const EXTENDED_WINDOW = 1_000_000;

export async function readContextUsedRatio(transcriptPath: string): Promise<number | null> {
  const tail = await readTail(transcriptPath, TAIL_BYTES);
  if (!tail) return null;
  const used = lastContextTokens(tail);
  return used === null ? null : contextRatio(used);
}

/** 기록에는 모델의 컨텍스트 창 크기가 없어서, 기본 창을 넘었으면 1M 창으로 본다. */
export function contextRatio(usedTokens: number): number {
  const window = usedTokens > STANDARD_WINDOW ? EXTENDED_WINDOW : STANDARD_WINDOW;
  return Math.min(1, usedTokens / window);
}

export function lastContextTokens(jsonlTail: string): number | null {
  const lines = jsonlTail.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{')) continue;
    try {
      const entry = JSON.parse(line) as { type?: string; message?: { usage?: Record<string, unknown> } };
      const usage = entry.type === 'assistant' ? entry.message?.usage : undefined;
      if (!usage) continue;
      const num = (k: string) => (typeof usage[k] === 'number' ? (usage[k] as number) : 0);
      return num('input_tokens') + num('cache_creation_input_tokens') + num('cache_read_input_tokens');
    } catch {
      // 끝부분을 잘라 읽어서 첫 줄이 깨질 수 있다. 그 줄은 건너뛴다.
    }
  }
  return null;
}

async function readTail(path: string, bytes: number): Promise<string | null> {
  try {
    const file = await open(path, 'r');
    try {
      const { size } = await file.stat();
      const start = Math.max(0, size - bytes);
      const buffer = Buffer.alloc(size - start);
      await file.read(buffer, 0, buffer.length, start);
      return buffer.toString('utf8');
    } finally {
      await file.close();
    }
  } catch {
    return null;
  }
}
