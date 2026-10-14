// 기록실 창(트로피 버튼): 최고 기록, 지금까지 한 일, 지금 사무실의 최고참·막내.
// 기록은 서버가 계산해 실시간 연결로 보내 준다. 이 파일은 받은 기록을 들고 있다가 그리기만 한다.
import { EMPTY_RECORDS, type RecordsState, type TimedRecord } from '../../../shared/records.ts';
import { profileKey, savedNameOf } from '../names.ts';
import type { AgentView } from '../panels/agentView.ts';
import { escapeHtml, setHtml } from '../panels/dom.ts';
import { currentLang, t } from '../i18n.ts';
import { durationParts } from './duration.ts';

let records: RecordsState = EMPTY_RECORDS;
export function setRecords(next: RecordsState): void { records = next; }

const formatDuration = (ms: number) => durationParts(ms).map(([unit, n]) => t(`dur.${unit}`, { n })).join(' ');
const formatWhen = (at: number) => new Date(at).toLocaleString(currentLang() === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** 기록을 세운 에이전트가 지금 사무실에 있으면 그 얼굴을 함께 보여 준다 */
function holderLine(record: TimedRecord, views: AgentView[]): string {
  const here = views.find((v) => profileKey(v.agent) === record.nameKey);
  const name = savedNameOf(record.nameKey) ?? record.who;
  const face = here?.portrait ? `<img src="${here.portrait}" alt="">` : '';
  const request = record.request ? `<span class="record-request">“${escapeHtml(record.request)}”</span>` : '';
  return `<span class="record-holder">${face}<span>${escapeHtml(name)}</span></span>${request}`;
}

function bestCard(label: string, value: string, detail: string, at: number | null): string {
  return `
    <li class="record-card">
      <span class="record-label">${label}</span>
      <b class="record-value">${value}</b>
      ${detail}
      ${at === null ? '' : `<span class="record-when">${formatWhen(at)}</span>`}
    </li>`;
}

function timedCard(label: string, record: TimedRecord | null, views: AgentView[]): string {
  return record
    ? bestCard(label, formatDuration(record.ms), holderLine(record, views), record.at)
    : bestCard(label, t('records.none'), '', null);
}

/** 지금 사무실에 있는 에이전트 중 가장 먼저 / 가장 늦게 시작한 에이전트 */
function officeNow(views: AgentView[], now: number): string {
  const present = views.filter((v) => v.agent.activity !== 'ended').sort((a, b) => a.agent.startedAt - b.agent.startedAt);
  if (!present.length) return `<p class="muted">${t('records.nobody')}</p>`;
  const row = (label: string, view: AgentView) => `
    <li>
      <span class="record-label">${label}</span>
      <span class="record-holder">${view.portrait ? `<img src="${view.portrait}" alt="">` : ''}<span>${escapeHtml(view.name)}</span></span>
      <span class="muted">${t('records.age', { time: formatDuration(now - view.agent.startedAt) })}</span>
    </li>`;
  const oldest = present[0];
  const youngest = present[present.length - 1];
  return `<ul class="records-now">${row(t('records.oldest'), oldest)}${youngest === oldest ? '' : row(t('records.youngest'), youngest)}</ul>`;
}

export function renderRecords(el: HTMLElement, views: AgentView[], now: number): void {
  const { totals, peakBusy } = records;
  const best = [
    peakBusy
      ? bestCard(t('records.peakBusy'), t('records.peakBusyValue', { n: peakBusy.count }), '', peakBusy.at)
      : bestCard(t('records.peakBusy'), t('records.none'), '', null),
    timedCard(t('records.longestTurn'), records.longestTurn, views),
    timedCard(t('records.fastestTurn'), records.fastestTurn, views),
    timedCard(t('records.longestLife'), records.longestLife, views)
  ].join('');

  setHtml(el, `
    <div class="records-head">
      <h2>${t('records.title')}</h2>
      <button class="btn sm" type="button" data-records-close aria-label="${t('records.close')}">✕</button>
    </div>
    <p class="muted">${records.since === null ? t('records.empty') : t('records.since', { date: formatWhen(records.since) })}</p>
    <h3>${t('records.best')}</h3>
    <ul class="records-best">${best}</ul>
    <div class="records-foot">
      <section>
        <h3>${t('records.totals')}</h3>
        <ul class="records-totals">
          <li><span>${t('records.turns')}</span><b>${t('records.turnsValue', { n: totals.turns.toLocaleString() })}</b></li>
          <li><span>${t('records.toolCalls')}</span><b>${t('records.toolCallsValue', { n: totals.toolCalls.toLocaleString() })}</b></li>
          <li><span>${t('records.workTime')}</span><b>${formatDuration(totals.workMs)}</b></li>
        </ul>
      </section>
      <section>
        <h3>${t('records.now')}</h3>
        ${officeNow(views, now)}
      </section>
    </div>
    <p class="muted">${t('records.liveOnly')}</p>`);
}
