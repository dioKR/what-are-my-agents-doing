// 사용자가 올린 캐릭터 시트를 ~/.wamad/characters/ 에 둔다: 그림은 <id>.png, 목록(이름·올린 시각)은 index.json.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MAX_CHARACTER_NAME_LENGTH, MAX_SHEET_BYTES, SHEET_HEIGHT, SHEET_WIDTH, type CustomCharacter } from '../shared/characterSheet.ts';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ID_PATTERN = /^[0-9a-f]{12}$/;

/** PNG 파일이면 가로·세로 크기, 아니면 null (파일 머리의 IHDR만 본다) */
export function pngSize(data: Buffer): { width: number; height: number } | null {
  if (data.length < 24 || !data.subarray(0, 8).equals(PNG_SIGNATURE) || data.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

export type SheetProblem = 'too-large' | 'not-png' | 'wrong-size';

/** 시트로 쓸 수 있는 파일인지. 쓸 수 있으면 null */
export function sheetProblem(data: Buffer): SheetProblem | null {
  if (data.length > MAX_SHEET_BYTES) return 'too-large';
  const size = pngSize(data);
  if (!size) return 'not-png';
  return size.width === SHEET_WIDTH && size.height === SHEET_HEIGHT ? null : 'wrong-size';
}

export const isCharacterId = (id: string): boolean => ID_PATTERN.test(id);

export const cleanCharacterName = (name: unknown): string =>
  (typeof name === 'string' ? name.trim().slice(0, MAX_CHARACTER_NAME_LENGTH) : '') || 'My character';

export class CharacterStore {
  list: CustomCharacter[] = [];
  private readonly dir: string;

  constructor(dir = join(homedir(), '.wamad', 'characters')) {
    this.dir = dir;
  }

  async load(): Promise<void> {
    try {
      this.list = JSON.parse(await readFile(this.indexPath(), 'utf8')) as CustomCharacter[];
    } catch {
      this.list = []; // 처음 쓰거나 목록이 깨졌으면 빈 목록
    }
  }

  /** 검사를 마친 시트를 저장하고 목록에 더한다 */
  async add(name: string, png: Buffer, now: number): Promise<CustomCharacter> {
    const character = { id: randomBytes(6).toString('hex'), name, createdAt: now };
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pngPath(character.id), png);
    this.list = [...this.list, character];
    await this.saveIndex();
    return character;
  }

  async remove(id: string): Promise<boolean> {
    if (!this.list.some((c) => c.id === id)) return false;
    this.list = this.list.filter((c) => c.id !== id);
    await this.saveIndex();
    await rm(this.pngPath(id), { force: true });
    return true;
  }

  async readPng(id: string): Promise<Buffer | null> {
    if (!isCharacterId(id) || !this.list.some((c) => c.id === id)) return null;
    return readFile(this.pngPath(id)).catch(() => null);
  }

  private indexPath = () => join(this.dir, 'index.json');
  private pngPath = (id: string) => join(this.dir, `${id}.png`);

  private async saveIndex(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.indexPath(), JSON.stringify(this.list, null, 2));
  }
}
