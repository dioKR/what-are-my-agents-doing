# 오른쪽 상세 칸: 상태 헤더 · 내 차례 박스 · 긴 글 정리

목표: 지도에서 에이전트 하나를 누르면, 오른쪽 패널만 보고 3초 안에 다음 두 가지를 안다.
(1) 지금 무엇을 하는지
(2) 내가 할 일이 있는지(승인, 답장, 확인할 링크)

이 문서는 PO 2회차 브리프의 H1~H3에 대한 디자인 스펙이다. 구현은 fe가 한다.

수정 범위: `web/src/panels/inspector.ts`, `web/src/panels/dom.ts`, `web/src/styles.css`, `web/src/i18n.ts`.
main.ts와 1회차 금지 파일은 바꾸지 않는다. 새 버튼은 main.ts가 이미 처리하는 `data-*` 속성(`data-rename`, `data-customize`, `data-tab`)만 쓴다.
1회차 토큰 `--s-*`, 묶음 `STATUS_GROUP`, `.badge`를 다시 쓴다. 공유를 위해 `STATUS_GROUP`은 dom.ts로 옮긴다.

## 새 순서

```
┌ 상태 헤더 ───────────────────────────────┐  ← 왼쪽 4px 띠 = 묶음 색
│ [!! 막힘]  쇼핑몰 웹                        │  ← 큰 배지 + 이름
│ 테스트 돌리는 중                            │  ← 지금 하는 일 (가장 큰 글자)
│ Bash npm test                              │  ← 실제 명령 한 줄
│ Claude Code · fe · /work/shop-web  이름 바꾸기 · 꾸미기 │ ← 메타 + 보조 버튼
└──────────────────────────────────────────┘
┌ 내 차례 ─────────────────────────────────┐  ← 상태별 색 상자
│ [!!] 같은 실패를 5번 반복했어요              │
│      터미널에서 원인을 확인해 주세요          │
│ ─ 확인할 링크 ─                             │
│ [PR] PR #42 · shop-web   새                │
│ [로컬] 로컬 서버 :5173                       │
└──────────────────────────────────────────┘
맡은 일      장바구니 수량 버그 고치고 … (3줄)
남긴 말      PR을 올렸습니다 … (4줄)
컨텍스트 49% ▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░ (한 줄)
할 일 · 하위 에이전트 · 우편 (지금처럼)
```

## H1 상태 헤더

블록 `.status-head`:
- `background: var(--panel-2)`, `border-left: 4px solid var(--s-<group>)`, `padding: 10px 12px`, 세로 간격 6px
- 묶음 클래스는 `.status-head.s-<group>`로 붙인다.

| 줄 | 내용 | 스타일 |
|---|---|---|
| 1 | 큰 배지 + 이름 | 배지: `.badge.lg`. 1회차 배지와 색·글자가 같고, 크기만 키운다. `font-size: 14px; line-height: 24px; padding: 0 9px`. 이름: `font-family: var(--pixel); font-size: 15px; color: var(--text)`. 한 줄로 두고 넘치면 말줄임 |
| 2 | 지금 하는 일 (`summary`, 없으면 activityLabel) | `font-size: 19px; font-weight: 700; line-height: 1.35; color: var(--text)`. 2줄 clamp. **패널에서 가장 큰 글자** |
| 3 | 실제 명령 (`detail`) | `font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; color: var(--muted); background: #181b20; padding: 2px 6px`. 1줄로 두고 말줄임. 전체 문장은 `title`에 넣는다. detail이 비면 이 줄을 빼고 자리도 남기지 않는다 |
| 4 | 메타 + 보조 버튼 | 왼쪽은 `도구 · 역할 · 경로`(`font-size: 11px; color: var(--muted)`, 1줄 말줄임)다. 오른쪽에 텍스트 버튼 둘을 둔다 |

보조 버튼 `.btn-link`:
- 테두리와 배경이 없다. `font-size: 12px; color: var(--muted); text-decoration: underline; min-height: 24px`
- 호버하면 `color: var(--text)`
- 속성은 지금과 같은 `data-rename`, `data-customize`
- 두 버튼 사이에 `·` 구분점을 둔다

기존 메타 줄 끝의 activityLabel 글자는 뺀다. 배지가 같은 일을 한다.

## H2 내 차례 박스

헤더 바로 아래에 항상 한 칸 둔다. 클래스는 `.my-turn.k-<kind>`이다.

### 다섯 가지 상태

우선순위 순서다. 위에서 먼저 맞는 하나가 **머리 줄**이 된다.

| kind | 조건 | 색 토큰 | 아이콘 | 머리 줄 ko | 머리 줄 en | 둘째 줄 ko | 둘째 줄 en |
|---|---|---|---|---|---|---|---|
| stuck | `activity === 'stuck'` | `--s-stuck` | `!!` | 같은 실패를 {n}번 반복했어요 | Failed {n} times in a row | 터미널에서 원인을 확인해 주세요 | Check the terminal for the cause |
| approve | `activity === 'waiting-permission'` | `--s-turn` | `!` | 승인을 기다려요 | Waiting for your approval | 터미널에서 허용하거나 거절해 주세요 | Allow or deny it in the terminal |
| reply | `activity === 'waiting-user'` | `--s-idle` | `↩` | 다음 지시를 기다려요 | Waiting for your next message | 터미널에서 답장하면 이어서 일해요 | Reply in the terminal to continue |
| links | 위 셋이 아니고, 확인할 링크가 1개 이상 | `--s-web` | `↗` | 확인할 링크 {n}개 | {n} link(s) to check | (둘째 줄 없음) | |
| none | 아무것도 없음 | — | `–` | 지금은 할 일이 없어요 | Nothing for you right now | (둘째 줄 없음) | |

- 주황과 빨강은 approve와 stuck에만 쓴다. reply는 내 차례이지만 막힌 일은 아니어서 회색(idle 색)으로 둔다.
- `{n}`은 stuck이면 `failStreak`, links이면 합친 뒤의 전체 링크 수다(보여 주는 3개가 아니다). "모두 보기 ({n})"와 숫자를 맞추려는 것이다.

### 링크와 상태가 함께 있을 때

**상태가 먼저, 링크는 같은 상자 안 아래에** 둔다.
- 머리 줄은 위 우선순위(stuck > approve > reply > links)로 하나만 고른다.
- 확인할 링크가 있으면, 머리 줄이 무엇이든 상자 아래쪽에 "확인할 링크" 목록을 붙인다.
- 목록 위에는 얇은 구분선(`border-top: 1px solid rgba(255,255,255,.12)`)과 작은 소제목(`font-size: 11px; color: var(--muted)`)을 둔다.
- 머리 줄이 links일 때는 소제목을 빼고 목록만 둔다.

### 확인할 링크 고르기

- `kind !== 'web'`인 링크(PR, 로컬)만 고른다. 웹 주소는 링크 탭에만 남긴다.
- **같은 주소는 하나로 합친다.** 가장 최근 것을 남긴다. 지금 화면에 `:4545`가 두 번 나오는 문제를 고친다.
  - `localhost`, `127.0.0.1`, `[::1]`은 같은 호스트로 본다. 끝의 `/`는 무시한다(구현 중 확정).
- 새것부터 최대 3개를 보여 준다.
- 10분 안에 알려 준 링크(alerts.ts의 `FRESH_LINK_MS`와 같은 기준)에는 `새` / `New` 칩을 붙인다. 칩 스타일은 `.chip.new { color: #15181c; background: var(--s-web); border-color: var(--s-web) }`이다.
- 합친 링크가 3개보다 많으면 목록 끝에 `링크 탭에서 모두 보기 ({n})` / `See all in Links ({n})` 버튼을 둔다. `data-tab="links"`를 쓰고, 모양은 `.btn-link`다.
- 링크 줄은 기존 `linkAnchor()`를 그대로 쓴다.

### 상자 모양

```css
.my-turn {
  --c: var(--s-idle);
  border: 2px solid var(--c);
  background: color-mix(in srgb, var(--c) 14%, var(--panel));
  padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;
}
.my-turn.k-stuck   { --c: var(--s-stuck); }
.my-turn.k-approve { --c: var(--s-turn); }
.my-turn.k-reply   { --c: var(--s-idle); }
.my-turn.k-links   { --c: var(--s-web); }
.my-turn.k-none    { border: 1px dashed var(--line); background: transparent; padding: 6px 10px; }

.my-turn .lead { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 4px 8px; align-items: center; }
.my-turn .ic   { width: 22px; height: 22px; display: grid; place-items: center; background: var(--c); color: #15181c;
                 font-family: var(--pixel); font-size: 12px; font-weight: 700; }
.my-turn .lead b     { font-size: 15px; color: var(--text); }       /* 머리 줄 */
.my-turn .lead small { grid-column: 2; font-size: 12px; color: #d9d3c5; } /* 둘째 줄 */
.my-turn.k-none .ic  { background: transparent; color: var(--muted); }
.my-turn.k-none b    { font-size: 13px; font-weight: 400; color: var(--muted); }
```

- 글자는 색 위에 직접 올리지 않는다. 머리 줄은 `--text`, 아이콘 칸은 색 바탕에 어두운 글자다. 그래서 빨강(`--s-stuck`, 카드 배경 대비 4.49:1)도 대비 문제가 없다.
- 섞은 배경 위의 `--text`는 약 10:1이다.
- 승인 대기와 막힘은 상자 테두리 2px로 충분히 튄다. 깜빡임 같은 애니메이션은 넣지 않는다. 0.25초마다 다시 그리기 때문이다.
- `aria-live`는 넣지 않는다. 지도 알림이 이미 `aria-live="polite"`이다.

## H3 긴 글 정리

| 항목 | 줄 수 | 비고 |
|---|---|---|
| 지금 하는 일 (헤더) | 2줄 clamp | |
| 실제 명령 (헤더) | 1줄 말줄임 | 지금은 2줄이다 |
| 맡은 일 | 3줄 clamp | 지금과 같다. 전체는 `title`에 둔다 |
| 남긴 말 | 4줄 clamp | 지금은 3줄이지만, 링크가 위로 올라가서 1줄 늘린다. 전체는 `title`에 둔다 |

- 맡은 일과 남긴 말은 지금의 `dl.explain` 2열 모양을 그대로 쓴다. "지금 하는 일" 행은 헤더로 올라갔으니 뺀다.
- 기존 "알려 준 링크" 블록은 내 차례 박스로 옮겼으니 지운다.

컨텍스트는 한 줄로 쓴다(`.ctx`).

```
컨텍스트  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░  49%
```

```css
.ctx { display: grid; grid-template-columns: max-content minmax(0, 1fr) 3.5em; gap: 8px; align-items: center; font-size: 12px; color: var(--muted); }
.ctx .bar { height: 6px; }
.ctx b { text-align: right; font-family: var(--pixel); font-weight: 400; color: var(--text); }
```

- 막대 색은 지금처럼 `contextColor()`를 쓴다.
- 모를 때는 같은 줄에 막대 대신 `모름` / `unknown`을 muted로 쓴다.

## 글꼴 주의

DotGothic16에서는 작은 크기의 `!`가 `|`처럼 보인다. 그래서 `.badge`와 `.my-turn .ic`는 `font-family: var(--body); font-weight: 700`로 쓴다.

## i18n 키 (추가)

| 키 | ko | en |
|---|---|---|
| `turn.stuck` | 같은 실패를 {n}번 반복했어요 | Failed {n} times in a row |
| `turn.stuckHint` | 터미널에서 원인을 확인해 주세요 | Check the terminal for the cause |
| `turn.approve` | 승인을 기다려요 | Waiting for your approval |
| `turn.approveHint` | 터미널에서 허용하거나 거절해 주세요 | Allow or deny it in the terminal |
| `turn.reply` | 다음 지시를 기다려요 | Waiting for your next message |
| `turn.replyHint` | 터미널에서 답장하면 이어서 일해요 | Reply in the terminal to continue |
| `turn.links` | 확인할 링크 {n}개 | {n} link(s) to check |
| `turn.linksSub` | 확인할 링크 | Links to check |
| `turn.none` | 지금은 할 일이 없어요 | Nothing for you right now |
| `turn.allLinks` | 링크 탭에서 모두 보기 ({n}) | See all in Links ({n}) |
| `link.new` | 새 | New |
| `inspector.contextShort` | 컨텍스트 | Context |
| `inspector.unknown` | 모름 | unknown |

## 완료 확인 (디자인 쪽)

1. 맨 위에 큰 배지와 19px "지금 하는 일"이 있고, 이름 바꾸기·꾸미기는 테두리 없는 작은 글자다.
2. 다섯 가지 상태(stuck, approve, reply, links, none)를 ko/en 각각 한 장씩 찍었을 때 색과 문구가 다르다.
   - stuck과 approve 상태에 링크도 있으면, 링크 목록이 같은 상자 아래에 붙는다.
3. 같은 url 링크가 두 번 나오지 않는다.
4. 1600×980 창에서 긴 맡은 일과 긴 남긴 말이 있어도, 컨텍스트 줄과 탭 머리가 첫 화면 안에 보인다.
