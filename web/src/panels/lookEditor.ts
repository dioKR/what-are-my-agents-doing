// 상세 칸 자리에 뜨는 꾸미기 편집기. 고르는 즉시 지도 위 캐릭터에 반영되고, 저장해야 기억된다.
import type { DollLook } from '../office/character/doll.ts';
import { ACCESSORIES, EYE_COLORS, FACE_MARKS, EYE_STYLES, HAIR_COLORS, HAIR_STYLES, OUTFITS, PANTS_COLORS, PRESETS, SHIRT_COLORS, SKIN_TONES } from '../office/look.ts';
import { previewOf } from '../office/portrait.ts';
import type { AgentView } from './agentView.ts';
import { escapeHtml, setHtml } from './dom.ts';
import { lt, t } from '../i18n.ts';
import { sheetPickerHtml } from '../characters/sheetPicker.ts';
import { sheetIdOf } from '../../../shared/characterSheet.ts';

/** sheetStatus: 캐릭터 시트를 올린 결과 한 줄 (없으면 null) */
export function renderLookEditor(el: HTMLElement, view: AgentView, draft: DollLook, sheetStatus: string | null): void {
  const choice = (name: keyof DollLook, value: string, label: string, swatch?: string) =>
    `<label class="choice${swatch ? ' swatch' : ''}" title="${escapeHtml(label)}">
      <input type="radio" name="${name}" value="${value}"${(draft[name] ?? 'none') === value ? ' checked' : ''}>
      ${swatch ? `<span style="background:${swatch}" aria-hidden="true"></span><span class="sr">${escapeHtml(label)}</span>` : `<span>${escapeHtml(label)}</span>`}
    </label>`;
  const group = (legend: string, items: string) => `<fieldset><legend>${legend}</legend><div class="choices">${items}</div></fieldset>`;
  const colors = (name: keyof DollLook, list: string[], label: string) => list.map((c, i) => choice(name, c, `${label} ${i + 1}`, c)).join('');

  // 올린 시트 캐릭터는 그림 그대로 그려서, 머리 · 옷 · 색 · 소품을 골라도 바뀌지 않는다. 그때는 숨긴다
  const usesSheet = sheetIdOf(draft.character) !== null;
  const partChoices = `
        ${group(t('look.hairStyle'), HAIR_STYLES.map((h) => choice('hairStyle', h.value, lt(h.label))).join(''))}
        ${group(t('look.hair'), colors('hair', HAIR_COLORS, t('look.hair')))}
        ${group(t('look.eyes'), EYE_STYLES.map((e) => choice('eyeStyle', e.value, lt(e.label))).join('') + colors('eyes', EYE_COLORS, t('look.eyes')))}
        ${group(t('look.skin'), colors('skin', SKIN_TONES, t('look.skin')))}
        ${group(t('look.outfit'), OUTFITS.map((o) => choice('outfit', o.value, lt(o.label))).join('') + colors('shirt', SHIRT_COLORS, t('look.outfit')))}
        ${group(t('look.pants'), colors('pants', PANTS_COLORS, t('look.pants')))}
        ${group(t('look.accessory'), ACCESSORIES.map((a) => choice('accessory', a.value, lt(a.label))).join(''))}
        ${group(t('look.mark'), FACE_MARKS.map((m) => choice('mark', m.value, lt(m.label))).join(''))}`;

  setHtml(el, `<div class="who"><b>${t('look.title')}</b><span>${escapeHtml(view.name)}</span></div>
    <form class="look-form" data-look-form="${view.agent.id}">
      <div class="look-preview"><img src="${previewOf(draft)}" alt="${t('look.preview')}" width="64" height="88"></div>
      <div class="look-fields">
        ${sheetPickerHtml(draft, sheetStatus)}
        <fieldset><legend>${t('look.preset')}</legend><div class="choices">${PRESETS.map((p) => `<button class="btn sm" type="button" data-look-preset="${p.id}">${escapeHtml(lt(p.label))}</button>`).join('')}</div></fieldset>
        ${usesSheet ? `<p class="sheet-hint">${t('look.sheetChosen')}</p>` : partChoices}
      </div>
      <div class="acts">
        <button class="btn sm primary" type="submit">${t('btn.save')}</button>
        <button class="btn sm" type="button" data-look-reset>${t('btn.resetLook')}</button>
        <button class="btn sm" type="button" data-look-cancel>${t('btn.cancel')}</button>
      </div>
    </form>`);
}

/** 폼에서 고른 값을 읽는다. 고르지 않은 항목은 지금 값을 그대로 둔다. */
export function readLookForm(form: HTMLFormElement, current: DollLook): DollLook {
  const data = new FormData(form);
  const pick = <K extends keyof DollLook>(key: K): DollLook[K] => (data.get(key) as DollLook[K] | null) ?? current[key];
  // 머리 모양 · 옷 · 눈 모양 · 얼굴 장식을 바꾸면 손 그림 캐릭터에서 벗어나 부품 조립 그림으로 그린다 (색과 소품은 손 그림에도 입힌다)
  const shapeChanged = (['hairStyle', 'outfit', 'eyeStyle', 'mark'] as const).some((key) => (pick(key) ?? 'none') !== (current[key] ?? 'none'));
  return {
    character: shapeChanged ? undefined : current.character,
    skin: pick('skin'), hair: pick('hair'), hairStyle: pick('hairStyle'), eyes: pick('eyes'), eyeStyle: pick('eyeStyle'),
    outfit: pick('outfit'), shirt: pick('shirt'), pants: pick('pants'), accessory: pick('accessory'), mark: pick('mark')
  };
}
