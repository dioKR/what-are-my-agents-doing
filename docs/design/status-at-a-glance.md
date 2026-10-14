# 한눈에 보는 상태: 상태 배지 · 방 간판 · 두 줄 설명

목표: 화면을 처음 연 사람이 설명 없이 10초 안에 "각 에이전트가 지금 무엇을 하는지" 알아본다.
PO 브리프의 가설 H1~H3에 대한 디자인 스펙이다. 구현은 fe가 한다.

수정 범위: `web/src/panels/agentBar.ts`, `web/src/styles.css`, `web/src/office/map.ts`(ROOMS만), `web/src/i18n.ts`.
labels.ts, renderer.ts 등 금지 파일은 바꾸지 않는다. 지도 위 글자는 CSS로만 다듬는다.

---

## H1 상태 배지

### 묶음 6개

색 규칙: **주황·빨강은 "내가 손대야 함"에만** 쓴다. 나머지는 초록·파랑·회색·보라로 나눈다.
배지는 색 칸에 어두운 글자(`#15181c`)를 올린다. 대비는 모두 4.5:1 이상이다.

| 묶음 | 포함 activity | 배지 ko | 배지 en | 토큰 | 색 | 글자 대비 |
|---|---|---|---|---|---|---|
| work | working, thinking, background | 일하는 중 | Working | `--s-work` | `#7cc68a` | 8.7:1 |
| web | researching, mail-send, mail-read | 웹·우편 | Web & mail | `--s-web` | `#72a9e6` | 7.2:1 |
| idle | waiting-user | 대기 중 | Idle | `--s-idle` | `#a4acb6` | 7.8:1 |
| turn | waiting-permission | ! 승인 필요 | ! Your turn | `--s-turn` | `#f0953a` | 7.7:1 |
| stuck | stuck | !! 막힘 | !! Stuck | `--s-stuck` (= `--danger`) | `#e2654f` | 5.3:1 |
| rest | compacting, ended | 쉬는 중 | Resting | `--s-rest` | `#b6a1e3` | 7.8:1 |

- 색만으로 구분하지 않는다. 배지에 글자가 있고, turn·stuck은 지도 알림(`!`, `!!`)과 같은 기호를 앞에 붙인다.
- idle(회색)과 rest(보라)는 둘 다 조용한 상태지만, 글자와 색 모두 다르다.
- 묶음 이름은 i18n 키로 둔다. 예: `status.work`, `status.web`, `status.idle`, `status.turn`, `status.stuck`, `status.rest`.
- activity → 묶음 표는 `agentBar.ts` 안에 `Record<Activity, StatusGroup>`으로 둔다. 새 activity가 생기면 타입 오류로 드러난다.

### 카드 배치

카드 높이를 늘리지 않도록 배지는 이름 아래, 얼굴 오른쪽에 둔다.

```
┌──────────────────────────┐
│ [얼굴] 쇼핑몰 웹           │  ← 이름 (기존 픽셀 글꼴 12px, 한 줄)
│ [28px] [일하는 중]         │  ← 배지
│ 웹에서 'feature flag       │  ← 설명 2줄 (H3)
│ rollout' 찾아보는 중       │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬         │  ← 컨텍스트 막대 (그대로)
└──────────────────────────┘
```

- `.head`: 얼굴 | 세로 칸(이름, 배지). 세로 칸은 `min-width: 0`으로 이름이 말줄임되게 한다.
- 배지 `.badge`: `display: inline-block; width: fit-content; font-family: var(--pixel); font-size: 11px; line-height: 14px; padding: 0 5px; color: #15181c; background: var(--s-…)`. 배지는 줄바꿈하지 않는다(`white-space: nowrap`).
- 묶음 클래스: `.badge.s-work`, `.s-web`, `.s-idle`, `.s-turn`, `.s-stuck`, `.s-rest`.
- `aria-label`에 묶음 이름을 넣는다: `"쇼핑몰 웹, 일하는 중: 테스트 돌리는 중, 컨텍스트 사용 40%"`처럼 묶음 이름 다음에 설명이 온다.
- `ended` 카드는 `opacity: .6`으로 흐리게 해서 퇴근한 에이전트가 시선을 끌지 않게 한다.

### 주황을 "내 차례"에만 남기기 (styles.css만)

지금은 선택된 카드 테두리와 승인 대기 표시가 둘 다 amber라서 헷갈린다.

- 선택된 카드: `.agentcard[aria-pressed="true"] { border-color: var(--text); }` (밝은 테두리, 12.2:1)
- 승인 대기 카드: `.agentcard.alert-waiting-permission { box-shadow: 0 0 0 2px var(--s-turn); }`
- 지도 알림 승인 대기: `.t-warn`의 테두리와 아이콘 배경을 `var(--s-turn)`으로 바꾼다.
- 포커스 링(amber)과 탭 밑줄은 그대로 둔다. 이 둘은 상태 표시가 아니다.

## H3 카드 설명 두 줄

- `.agentcard .st`: `white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere;`
- 글자는 키우고 밝게 한다. 이 줄이 카드에서 가장 중요한 정보다. `font-size: 12px; line-height: 1.35; color: #d9d3c5` (카드 배경 대비 10.2:1)
- 모든 카드 높이를 맞추려고 `height: calc(2 * 1.35em)`으로 고정한다. 한 줄짜리 설명도 두 줄 높이를 차지한다.
- 카드 폭 150px은 그대로 둔다.
- `title`에는 기존처럼 전체 문장을 넣는다.

## H2 방 간판

### 문구

`map.ts`의 `ROOMS[].name`에 `\n`으로 두 줄을 넣는다. 둘째 줄은 "이 방에 있으면 무엇을 하는 중인지"를 나타낸다.

| 방 | ko | en | 방 안쪽 폭(칸) |
|---|---|---|---|
| 개발실 | `개발실\n파일·명령 작업` | `Dev room\nFiles & commands` | 16 |
| 자료실 | `자료실\n웹 검색` | `Library\nWeb search` | 7 |
| 서버실 | `서버실\n백그라운드 실행` | `Server room\nBackground jobs` | 6 |
| 수면실 | `수면실\n대화 요약` | `Nap room\nCompacting` | 13 |
| 탕비실 | `탕비실\n지시 기다림` | `Pantry\nWaiting for you` | 9 |
| 로비 | `로비\nSlack·메일` | `Lobby\nSlack & mail` | 7 |
| 회의실 | `회의실\n팀 회의` | `Meeting room\nTeam meeting` | 10 |

폭 확인: 간판이 보이는 가장 작은 배율은 1.2다(그보다 작으면 `.small`이 간판을 숨긴다). 이때 가장 좁은 서버실 안쪽 폭은 6칸 × 16 × 1.2 ≈ 115px이다.
가장 긴 둘째 줄은 "백그라운드 실행"(10px 글꼴, 약 80px)과 "Background jobs"(약 85px)다. 좌우 padding을 더해도 100px 안이라 방 폭을 넘지 않는다.

### 모양 (styles.css `.room-name`)

```css
.room-name {
  position: absolute; transform: translate(-50%, -100%);
  white-space: pre-line; text-align: center;
  font-family: var(--pixel); font-size: 10px; line-height: 1.25;
  color: #d8ceb4;                      /* 둘째 줄: 하는 일 */
  background: rgba(15, 17, 20, 0.78);  /* 바닥 무늬 위에서도 읽히는 판 */
  padding: 2px 6px;
  border-top: 2px solid rgba(255, 250, 235, 0.25);
}
.room-name::first-line { font-size: 12px; color: #fffaeb; } /* 첫째 줄: 방 이름 */
```

- 대비: 방 이름 `#fffaeb`은 판 대비 17:1, 하는 일 `#d8ceb4`는 판 대비 11.5:1이다.
- `transform`을 `-50%, -50%`에서 `-50%, -100%`로 바꾼다. 간판 아랫변이 기준점(방 아래 벽 바로 위)에 닿게 해서, 두 줄로 커져도 아래 벽을 넘어가지 않는다.
- 회의실 간판만 기준점을 방 밖 아래 벽 (41.5, 26.2)으로 옮긴다. 방 안에서는 팀원 이름표와 겹치기 때문이다.
  - 위 줄 팀원 이름표가 탁자 위(약 y 20.3)에 온다.
  - 아래 줄 팀원 이름표가 약 y 24~24.6에 온다.
  - 벽에 붙인 명패처럼 보이게 한다.
- 방마다 다른 색은 쓰지 않는다. 모든 방에 클래스가 같아서다.
- `.small .room-name { display: none; }`는 그대로 둔다.

## 토큰 추가 (`:root`)

```css
--s-work: #7cc68a;
--s-web: #72a9e6;
--s-idle: #a4acb6;
--s-turn: #f0953a;
--s-stuck: var(--danger);
--s-rest: #b6a1e3;
```

## 완료 확인 (디자인 쪽)

1. 카드 11개를 훑으면 색이 많아야 6가지이고, 주황·빨강 카드는 승인 대기·막힘뿐이다.
2. 모든 카드 높이가 같고, 설명이 두 줄까지 보인다.
3. 배율 1.2~1.6에서, ko와 en 모두 방 간판 7개가 방 폭 안에 들어간다. (.game max-width 1640px 때문에 실제 배율은 1.6을 넘지 않는다.)
4. 선택된 카드 테두리가 주황이 아니다.
