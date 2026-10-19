// ~/.wamad 아래 JSON 파일 하나를 메모리에 들고 있다가, 바뀌면 조금 모았다가 저장한다 (지갑, 기록실).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SAVE_DELAY_MS = 500;

export class JsonFileStore<T extends object> {
  state: T;
  private readonly path: string;
  private readonly empty: T;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(path: string, empty: T) {
    this.path = path;
    this.empty = empty;
    this.state = empty;
  }

  async load(): Promise<void> {
    try {
      this.state = { ...this.empty, ...(JSON.parse(await readFile(this.path, 'utf8')) as Partial<T>) };
    } catch {
      this.state = this.empty; // 처음 쓰거나 파일이 깨졌으면 빈 상태
    }
  }

  set(next: T): void {
    this.state = next;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(), SAVE_DELAY_MS);
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.state, null, 2));
  }
}
