// 화면 쪽 캐릭터 시트 목록: 서버가 알려 준 목록을 들고, 그림을 불러오고, 올리기 · 지우기 · 템플릿 내려받기를 한다.
import { type CustomCharacter } from '../../../shared/characterSheet.ts';
import { clearDollFrames, type DollLook } from '../office/character/doll.ts';
import { missingCells } from '../office/character/sheetCells.ts';
import { addSheet, hasSheet, readSheet, removeSheet } from '../office/character/sheets.ts';
import { sheetTemplateOf } from '../office/character/sheetTemplate.ts';
import { clearPortraits } from '../office/portrait.ts';

export type UploadResult =
  | { ok: true; character: CustomCharacter }
  | { ok: false; error: 'not-image' | 'wrong-size' | 'server' }
  | { ok: false; error: 'missing-cells'; missing: string[] };

let characters: CustomCharacter[] = [];

export const customCharacters = (): CustomCharacter[] => characters;

/**
 * 서버가 알려 준 목록으로 바꾸고, 새로 생긴 시트 그림을 불러온다.
 * onSheetsChanged: 그림을 불러오거나 지워서 캐릭터를 다시 그려야 할 때 부른다.
 */
export function syncCustomCharacters(next: CustomCharacter[], onSheetsChanged: () => void): void {
  const nextIds = new Set(next.map((c) => c.id));
  const removed = characters.filter((c) => !nextIds.has(c.id));
  characters = next;
  removed.forEach((c) => removeSheet(c.id));
  if (removed.length) redraw(onSheetsChanged);
  for (const character of next) {
    if (!hasSheet(character.id)) void loadSheet(character.id).then((loaded) => { if (loaded) redraw(onSheetsChanged); });
  }
}

function redraw(onSheetsChanged: () => void): void {
  clearDollFrames();
  clearPortraits();
  onSheetsChanged();
}

async function loadSheet(id: string): Promise<boolean> {
  const image = await fetch(`/api/characters/${id}.png`).then((r) => (r.ok ? r.blob() : null)).then((b) => (b ? createImageBitmap(b) : null)).catch(() => null);
  const sheet = image && readSheet(image);
  if (!sheet) return false;
  addSheet(id, sheet);
  return true;
}

/** PNG를 검사하고(크기 · 꼭 그려야 하는 칸) 서버에 올린다. 이름은 파일 이름에서 확장자를 뺀 것 */
export async function uploadSheet(file: File): Promise<UploadResult> {
  const image = await createImageBitmap(file).catch(() => null);
  if (!image) return { ok: false, error: 'not-image' };
  const sheet = readSheet(image);
  if (!sheet) return { ok: false, error: 'wrong-size' };
  const missing = missingCells(sheet.isEmpty);
  if (missing.length) return { ok: false, error: 'missing-cells', missing: missing.map(([facing, pose]) => `${facing} ${pose}`) };

  const png = await base64Of(file);
  const res = await fetch('/api/characters', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name.replace(/\.png$/i, ''), png })
  }).catch(() => null);
  if (!res?.ok) return { ok: false, error: 'server' };
  return { ok: true, character: (await res.json()) as CustomCharacter };
}

/** 파일 내용을 base64 글자로 (data:image/png;base64, 뒷부분) */
function base64Of(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function deleteSheet(id: string): Promise<void> {
  await fetch(`/api/characters/${id}`, { method: 'DELETE' }).catch(() => null);
}

/** 지금 캐릭터를 시트 템플릿 PNG로 내려받는다 */
export function downloadSheetTemplate(look: DollLook): void {
  sheetTemplateOf(look).toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'wamad-character-sheet.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
  });
}
