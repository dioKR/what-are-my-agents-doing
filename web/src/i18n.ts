// 화면 언어(한국어·영어). 고른 언어는 이 브라우저에 기억한다.
import type { Activity, LocalText, TodoItem } from '../../shared/protocol.ts';

export type Lang = 'ko' | 'en';
const STORAGE_KEY = 'wamad.lang';
/** 이름을 바꾸기 전(Agent Office)에 저장한 값 */
const LEGACY_STORAGE_KEY = 'agent-office.lang';

let lang: Lang = readInitialLang();

function readInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 저장소를 못 쓰면 브라우저 언어를 따른다
  }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export const currentLang = (): Lang => lang;

export function setLang(next: Lang): void {
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 이번 창에서만 바뀐다
  }
}

/** 서버가 보낸 두 언어 문장 중 지금 언어 */
export const lt = (text: LocalText | { ko: string; en: string }): string => text[lang];

const KO = {
  'app.title': '내 에이전트들은 뭘 하고 있을까?',
  'shop.open': '꾸미기 상점', 'shop.title': '꾸미기 상점', 'shop.close': '닫기',
  'shop.for': '{name}에게 입히기', 'shop.pick': '지도에서 캐릭터를 고르면 바로 입힐 수 있어요. 지금은 사기만 할 수 있습니다.',
  'shop.tab.head': '머리 장식', 'shop.tab.pet': '펫',
  'shop.buy': '사기 · {price}', 'shop.owned': '가지고 있음', 'shop.wear': '입히기', 'shop.takeOff': '벗기기', 'shop.bring': '데리고 다니기', 'shop.leave': '두고 가기',
  'shop.howToEarn': '코인 버는 법', 'shop.liveOnly': '앱을 켜 둔 동안 에이전트가 한 일만 코인이 됩니다.',
  'shop.reason.turn': '일을 하다가 한 턴을 마침', 'shop.reason.todo': '할 일 하나 끝냄', 'shop.reason.teamTask': '팀 할 일 하나 끝냄', 'shop.reason.pr': 'PR을 올림',
  'shop.recent': '최근에 번 코인', 'shop.noRecent': '아직 번 코인이 없습니다. 에이전트에게 일을 시켜 보세요.',
  'app.connecting': '서버에 연결하는 중… (wamad 또는 npm start)',
  'app.connected': '서버 연결됨 · 에이전트 {n}명',
  'settings.open': '설정', 'settings.title': '설정', 'settings.time': '시간대', 'settings.lang': '언어',
  'time.auto': '지금 시각', 'time.day': '낮', 'time.evening': '저녁', 'time.night': '밤',
  'empty.title': '아직 연결된 에이전트가 없습니다',
  'empty.step1': 'Claude Code를 실행하고 아무 일이나 시켜 보세요. 지난 1시간 안에 움직인 세션이 자동으로 나타납니다.',
  'empty.step2': '권한 승인 대기까지 정확히 보려면 터미널에서 npm run hooks:install 로 훅을 설치하세요.',
  'tab.activity': '활동 기록', 'tab.links': '링크', 'tab.mail': '우편 기록', 'tab.todos': '할 일',
  'inspector.pick': '지도에서 캐릭터를 누르거나 위쪽 카드를 고르면 여기에 자세한 상태가 나옵니다.',
  'inspector.request': '맡은 일', 'inspector.said': '에이전트가 남긴 말',
  'inspector.context': '컨텍스트 사용', 'inspector.contextUnknown': '컨텍스트 사용량은 아직 모릅니다.',
  'inspector.subagents': '하위 에이전트: {list}', 'inspector.sent': '보냄', 'inspector.read': '읽음',
  'btn.rename': '이름 바꾸기', 'btn.customize': '꾸미기', 'btn.save': '저장', 'btn.cancel': '취소', 'btn.resetLook': '기본 모습으로',
  'rename.title': '이름 바꾸기', 'rename.label': '새 이름', 'rename.hint': '같은 폴더에서 다시 실행해도 이 이름으로 나옵니다. 비워 두고 저장하면 기본 이름으로 돌아갑니다.',
  'look.title': '꾸미기', 'look.preview': '미리보기', 'look.preset': '기본 캐릭터에서 시작', 'look.hairStyle': '머리 모양', 'look.hair': '머리색',
  'look.eyes': '눈', 'look.skin': '피부', 'look.outfit': '옷', 'look.pants': '바지·치마', 'look.accessory': '소품', 'look.mark': '얼굴 장식',
  'alert.stuck': '{name}: 같은 실패 {n}번 반복', 'alert.permission': '{name}: 승인을 기다려요', 'alert.context': '{name}: 컨텍스트 {n}%',
  'log.pick': '에이전트를 고르면 최근에 한 일이 순서대로 나옵니다.', 'log.none': '{name}의 활동이 아직 없습니다.', 'log.title': '{name} · 최근에 한 일 (맨 위가 지금)',
  'links.none': '에이전트가 PR 주소나 로컬 서버 주소(localhost)를 알려 주면 여기 모입니다. 누르면 새 탭에서 열립니다.',
  'mail.none': '아직 주고받은 우편이 없습니다. 에이전트가 Slack이나 메일 도구로 메시지를 보내거나 읽으면 여기에 남고, 캐릭터가 로비 우편함으로 갑니다.',
  'mail.time': '시각', 'mail.who': '누가', 'mail.where': '어디', 'mail.what': '내용',
  'todos.none': '에이전트가 할 일 목록(TodoWrite)을 만들면 여기와 개발실 벽 보드에 나옵니다.',
  'link.pr': 'PR', 'link.local': '로컬', 'link.web': '웹', 'link.new': '새',
  'inspector.contextShort': '컨텍스트', 'inspector.unknown': '모름',
  'turn.stuck': '같은 실패를 {n}번 반복했어요', 'turn.stuckHint': '터미널에서 원인을 확인해 주세요',
  'turn.approve': '승인을 기다려요', 'turn.approveHint': '터미널에서 허용하거나 거절해 주세요',
  'turn.reply': '다음 지시를 기다려요', 'turn.replyHint': '터미널에서 답장하면 이어서 일해요',
  'turn.links': '확인할 링크 {n}개', 'turn.linksSub': '확인할 링크', 'turn.none': '지금은 할 일이 없어요', 'turn.allLinks': '링크 탭에서 모두 보기 ({n})',
  'map.sub': '하위 {n}', 'map.courier': '배달부', 'map.aria': '내 에이전트 회사 지도',
  'team.title': '팀', 'team.ceo': 'CEO (나)',
  'team.ceoSays': 'CEO: {text}', 'team.toSays': '→ {to}: {text}', 'team.everyone': '모두',
  'tab.team': '팀', 'team.none': '아직 팀이 없습니다. 팀 킷을 설치하고 리더에게 팀을 꾸려 달라고 하면, 역할별 팀원이 회의실에 모입니다 (README의 "팀" 참고).',
  'team.lead': '리더 (CEO 자리)', 'team.members': '팀원', 'team.tasks': '팀 할 일', 'team.messages': '오간 메시지', 'team.open': '진행', 'team.done': '완료'
};
type Key = keyof typeof KO;

const EN: Record<Key, string> = {
  'app.title': 'What Are My Agents Doing?',
  'shop.open': 'Dress-up shop', 'shop.title': 'Dress-up shop', 'shop.close': 'Close',
  'shop.for': 'Dressing {name}', 'shop.pick': 'Pick a character on the map to dress it. For now you can only buy.',
  'shop.tab.head': 'Headwear', 'shop.tab.pet': 'Pets',
  'shop.buy': 'Buy · {price}', 'shop.owned': 'Owned', 'shop.wear': 'Wear', 'shop.takeOff': 'Take off', 'shop.bring': 'Bring along', 'shop.leave': 'Leave behind',
  'shop.howToEarn': 'How agents earn coins', 'shop.liveOnly': 'Only work your agents do while this is running earns coins.',
  'shop.reason.turn': 'Finished a turn of work', 'shop.reason.todo': 'Completed a todo', 'shop.reason.teamTask': 'Completed a team task', 'shop.reason.pr': 'Opened a PR',
  'shop.recent': 'Recently earned', 'shop.noRecent': 'No coins yet. Give your agents some work.',
  'app.connecting': 'Connecting to the server… (wamad or npm start)',
  'app.connected': 'Connected · {n} agents',
  'settings.open': 'Settings', 'settings.title': 'Settings', 'settings.time': 'Time of day', 'settings.lang': 'Language',
  'time.auto': 'Now', 'time.day': 'Day', 'time.evening': 'Evening', 'time.night': 'Night',
  'empty.title': 'No agents connected yet',
  'empty.step1': 'Start Claude Code and give it any task. Sessions active in the last hour show up automatically.',
  'empty.step2': 'To also see permission prompts, install the hooks with npm run hooks:install.',
  'tab.activity': 'Activity', 'tab.links': 'Links', 'tab.mail': 'Mail', 'tab.todos': 'Todos',
  'inspector.pick': 'Click a character on the map or a card above to see its details here.',
  'inspector.request': 'Task', 'inspector.said': 'Last said',
  'inspector.context': 'Context used', 'inspector.contextUnknown': 'Context usage is not known yet.',
  'inspector.subagents': 'Subagents: {list}', 'inspector.sent': 'Sent', 'inspector.read': 'Read',
  'btn.rename': 'Rename', 'btn.customize': 'Customize', 'btn.save': 'Save', 'btn.cancel': 'Cancel', 'btn.resetLook': 'Reset look',
  'rename.title': 'Rename', 'rename.label': 'New name', 'rename.hint': 'The name sticks for this folder. Save it empty to go back to the default.',
  'look.title': 'Customize', 'look.preview': 'Preview', 'look.preset': 'Start from a character', 'look.hairStyle': 'Hair style', 'look.hair': 'Hair color',
  'look.eyes': 'Eyes', 'look.skin': 'Skin', 'look.outfit': 'Outfit', 'look.pants': 'Pants / skirt', 'look.accessory': 'Accessory', 'look.mark': 'Face detail',
  'alert.stuck': '{name}: failed {n} times in a row', 'alert.permission': '{name}: waiting for approval', 'alert.context': '{name}: context {n}%',
  'log.pick': 'Pick an agent to see what it did recently.', 'log.none': 'No activity from {name} yet.', 'log.title': '{name} · recent activity (newest first)',
  'links.none': 'PR links and local servers (localhost) your agents mention collect here. Click to open in a new tab.',
  'mail.none': 'No mail yet. When an agent sends or reads Slack or email through a tool, it shows up here and the character walks to the lobby mailbox.',
  'mail.time': 'Time', 'mail.who': 'Who', 'mail.where': 'Where', 'mail.what': 'Message',
  'todos.none': 'When an agent writes a todo list (TodoWrite), it shows up here and on the dev room board.',
  'link.pr': 'PR', 'link.local': 'Local', 'link.web': 'Web', 'link.new': 'New',
  'inspector.contextShort': 'Context', 'inspector.unknown': 'unknown',
  'turn.stuck': 'Failed {n} times in a row', 'turn.stuckHint': 'Check the terminal for the cause',
  'turn.approve': 'Waiting for your approval', 'turn.approveHint': 'Allow or deny it in the terminal',
  'turn.reply': 'Waiting for your next message', 'turn.replyHint': 'Reply in the terminal to continue',
  'turn.links': '{n} link(s) to check', 'turn.linksSub': 'Links to check', 'turn.none': 'Nothing for you right now', 'turn.allLinks': 'See all in Links ({n})',
  'map.sub': '+{n} sub', 'map.courier': 'Courier', 'map.aria': 'Office map of my agents',
  'team.title': 'Team', 'team.ceo': 'CEO (you)',
  'team.ceoSays': 'CEO: {text}', 'team.toSays': '→ {to}: {text}', 'team.everyone': 'everyone',
  'tab.team': 'Team', 'team.none': 'No team yet. Install the team kit and ask the lead to form a team; role-based teammates gather in the meeting room (see "Team" in the README).',
  'team.lead': 'Lead (CEO seat)', 'team.members': 'Members', 'team.tasks': 'Team tasks', 'team.messages': 'Messages', 'team.open': 'Open', 'team.done': 'Done'
};

export function t(key: Key, params: Record<string, string | number> = {}): string {
  const template = (lang === 'ko' ? KO : EN)[key];
  return template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''));
}

export const ACTIVITY_LABEL: Record<Lang, Record<Activity, string>> = {
  ko: {
    working: '작업 중', thinking: '생각 중', 'waiting-permission': '승인 기다림', 'waiting-user': '지시 기다림',
    compacting: '수면실에서 요약 중', researching: '자료실에서 찾는 중', background: '서버실에서 실행 중',
    'mail-send': '우편 보내는 중', 'mail-read': '우편 읽는 중', stuck: '같은 실패 반복 중', ended: '퇴근'
  },
  en: {
    working: 'Working', thinking: 'Thinking', 'waiting-permission': 'Needs approval', 'waiting-user': 'Waiting for you',
    compacting: 'Compacting in the nap room', researching: 'Researching in the library', background: 'Running in the server room',
    'mail-send': 'Sending mail', 'mail-read': 'Reading mail', stuck: 'Stuck in a failure loop', ended: 'Left for the day'
  }
};
export const activityLabel = (activity: Activity): string => ACTIVITY_LABEL[lang][activity];

/** 카드 상태 배지의 묶음. 어떤 활동이 어느 묶음인지는 카드 줄(agentBar)이 정한다. */
export type StatusGroup = 'work' | 'web' | 'idle' | 'turn' | 'stuck' | 'rest';
const STATUS: Record<Lang, Record<StatusGroup, string>> = {
  ko: { work: '일하는 중', web: '웹·우편', idle: '대기 중', turn: '! 승인 필요', stuck: '!! 막힘', rest: '쉬는 중' },
  en: { work: 'Working', web: 'Web & mail', idle: 'Idle', turn: '! Your turn', stuck: '!! Stuck', rest: 'Resting' }
};
export const statusLabel = (group: StatusGroup): string => STATUS[lang][group];

const TODO: Record<Lang, Record<TodoItem['status'], string>> = {
  ko: { pending: '할 일', in_progress: '진행', completed: '완료' },
  en: { pending: 'To do', in_progress: 'Doing', completed: 'Done' }
};
export const todoLabel = (status: TodoItem['status']): string => TODO[lang][status];

/** HTML에 data-i18n="키"로 적어 둔 고정 글자를 지금 언어로 바꾼다 */
export function applyStaticTexts(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n as Key); });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria as Key)); });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle as Key); });
}
