// 꾸미기 편집기 안의 "내 캐릭터 (PNG 시트)" 칸: 올린 캐릭터 고르기 · 지우기, PNG 올리기, 템플릿 내려받기.
import { SHEET_CHARACTER_PREFIX } from '../../../shared/characterSheet.ts';
import type { DollLook } from '../office/character/doll.ts';
import { previewOf } from '../office/portrait.ts';
import { escapeHtml } from '../panels/dom.ts';
import { t } from '../i18n.ts';
import { customCharacters } from './library.ts';

/** status: 방금 올린 결과처럼 칸 아래에 보여 줄 한 줄 (없으면 null) */
export function sheetPickerHtml(draft: DollLook, status: string | null): string {
  const choices = customCharacters().map((c) => {
    const character = `${SHEET_CHARACTER_PREFIX}${c.id}`;
    const chosen = draft.character === character;
    return `
      <span class="sheet-choice${chosen ? ' on' : ''}">
        <button class="btn sm" type="button" data-look-sheet="${c.id}" aria-pressed="${chosen}">
          <img src="${previewOf({ ...draft, character })}" alt="" width="16" height="22">${escapeHtml(c.name)}
        </button>
        <button class="btn sm" type="button" data-sheet-delete="${c.id}" aria-label="${escapeHtml(t('look.sheetDelete', { name: c.name }))}">✕</button>
      </span>`;
  }).join('');
  return `
    <fieldset class="sheet-picker">
      <legend>${t('look.sheets')}</legend>
      <div class="choices">
        ${choices}
        <label class="btn sm">${t('look.sheetUpload')}<input type="file" accept="image/png" data-sheet-upload hidden></label>
        <button class="btn sm" type="button" data-sheet-template>${t('look.sheetTemplate')}</button>
      </div>
      ${status ? `<p class="sheet-status" role="status">${escapeHtml(status)}</p>` : ''}
      <p class="sheet-hint">${t('look.sheetHint')}</p>
      <p class="sheet-hint">${t('look.sheetPersonal')}</p>
    </fieldset>`;
}
