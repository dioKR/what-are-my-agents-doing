// 도구 호출을 사람이 읽는 한 문장으로 바꾼다. 화면이 언어를 고를 수 있게 한국어·영어를 함께 만든다.
// 예: Bash "npm test" → { ko: '테스트 돌리는 중', en: 'Running tests' }
import { shortPath } from './shortPath.ts';
import { isBroadcastRecipient, type LocalText } from '../shared/protocol.ts';

const MAX_TARGET = 40;
const both = (ko: string, en: string): LocalText => ({ ko, en });

/** 자주 쓰는 고정 문장 */
export const PHRASES = {
  waitingForInstruction: both('다음 지시를 기다리는 중', 'Waiting for the next instruction'),
  thinkingAfterCompact: both('요약을 마치고 이어서 생각하는 중', 'Back from compacting, thinking'),
  readingRequest: both('요청을 읽고 생각하는 중', 'Reading the request'),
  compacting: both('대화를 요약하는 중', 'Compacting the conversation'),
  sessionEnded: both('세션을 마침', 'Session ended'),
  waitingPermission: both('실행해도 되는지 승인을 기다리는 중', 'Waiting for your approval'),
  turnFinished: both('한 턴을 마침', 'Finished a turn'),
  compactedLog: both('컨텍스트가 차서 대화를 요약함', 'Context filled up, compacted'),
  newRequest: both('새 요청 받음', 'Got a new request'),
  joinedTeam: both('회의실에 들어와 자리에 앉음', 'Joined the meeting room'),
  teammateIdle: both('맡은 일을 마치고 기다리는 중', 'Done for now, waiting')
} as const;

export const messageSent = (to: string): LocalText =>
  isBroadcastRecipient(to) ? both('팀 전체에게 메시지 보내는 중', 'Messaging the whole team') : both(`${to}에게 메시지 보내는 중`, `Messaging ${to}`);
export const requestReceived = (request: string): LocalText => both(`요청 받음: ${request}`, `Request: ${request}`);

export function mailSummary(channel: string, target: string, direction: 'sent' | 'read'): LocalText {
  const where = `${channel} ${target}`.trim();
  return direction === 'sent' ? both(`${where} 보내기`, `Sending to ${where}`) : both(`${where} 읽기`, `Reading ${where}`);
}

export function humanizeTool(toolName: string, input: Record<string, unknown>, cwd: string): LocalText {
  const file = () => {
    const target = text(input, 'file_path') || text(input, 'notebook_path') || text(input, 'path');
    return target ? shortPath(target, cwd, MAX_TARGET) : 'file';
  };
  switch (toolName) {
    case 'Read': return both(`${file()} 읽는 중`, `Reading ${file()}`);
    case 'Edit': case 'MultiEdit': case 'NotebookEdit': return both(`${file()} 고치는 중`, `Editing ${file()}`);
    case 'Write': return both(`${file()} 만드는 중`, `Writing ${file()}`);
    case 'Grep': return both(`코드에서 '${clip(text(input, 'pattern'))}' 찾는 중`, `Searching code for '${clip(text(input, 'pattern'))}'`);
    case 'Glob': return both(`파일 찾는 중 (${clip(text(input, 'pattern'))})`, `Finding files (${clip(text(input, 'pattern'))})`);
    case 'Bash': return humanizeCommand(text(input, 'command'), text(input, 'description'));
    case 'WebSearch': return both(`웹에서 '${clip(text(input, 'query'))}' 검색 중`, `Searching the web for '${clip(text(input, 'query'))}'`);
    case 'WebFetch': return both(`웹 페이지 읽는 중 (${hostOf(text(input, 'url'))})`, `Reading a web page (${hostOf(text(input, 'url'))})`);
    case 'Task': case 'Agent': {
      const what = clip(text(input, 'description') || text(input, 'subagent_type'));
      return both(`하위 에이전트에게 맡기는 중: ${what}`, `Delegating to a subagent: ${what}`);
    }
    case 'TodoWrite': return both('할 일 목록 정리 중', 'Updating the todo list');
    case 'ExitPlanMode': return both('작업 계획 정리 중', 'Finalizing the plan');
    case 'AskUserQuestion': return both('사람에게 물어보는 중', 'Asking you a question');
    case 'Skill': return both(`스킬 불러오는 중: ${clip(text(input, 'skill'))}`, `Loading skill: ${clip(text(input, 'skill'))}`);
    case 'SendMessage': return both(`팀원에게 메시지 보내는 중`, `Messaging a teammate`);
  }
  if (toolName.startsWith('mcp__')) {
    const [, server = '', tool = ''] = toolName.split('__');
    return both(`${server} 도구 사용 중 (${tool})`, `Using ${server} (${tool})`);
  }
  return both(`${toolName} 사용 중`, `Using ${toolName}`);
}

/** 명령어 앞부분을 보고 무슨 종류의 일인지 짐작한다. 모르면 Claude가 단 설명이나 명령 자체를 보여 준다. */
export function humanizeCommand(command: string, description = ''): LocalText {
  const c = command.trim();
  const has = (re: RegExp) => re.test(c);
  if (has(/\b(test|vitest|jest|pytest|mocha)\b/)) return both('테스트 돌리는 중', 'Running tests');
  if (has(/\b(tsc|typecheck|lint|eslint)\b/)) return both('타입·코드 검사 중', 'Type-checking / linting');
  if (has(/\b(build|vite build|webpack|xcodebuild|gradle)\b/)) return both('빌드하는 중', 'Building');
  if (has(/\b(npm|pnpm|yarn|bun|pip)\s+(i|install|add)\b/)) return both('패키지 설치 중', 'Installing packages');
  if (has(/\bgit\s+(commit)\b/)) return both('git 커밋하는 중', 'Committing');
  if (has(/\bgit\s+(push)\b/)) return both('git 푸시하는 중', 'Pushing');
  if (has(/\bgit\s+(status|diff|log|show)\b/)) return both('바뀐 내용 확인하는 중', 'Checking changes');
  if (has(/\bgh\s+pr\b/)) return both('PR 다루는 중', 'Working on a PR');
  if (has(/\b(curl|wget)\b/)) return both('서버에 요청 보내는 중', 'Calling a server');
  if (has(/^(ls|find|cat|head|tail|grep|rg|sed -n)\b/)) return both('파일 살펴보는 중', 'Looking through files');
  if (description) return both(clip(description), clip(description));
  const first = clip(c.split('\n')[0]);
  return both(`명령 실행 중: ${first}`, `Running: ${first}`);
}

/** 사람이 쓴 요청에서 앞뒤 공백과 붙어 온 태그를 걷어 내고 한 줄로 */
export function cleanPrompt(prompt: string, max = 140): string {
  return clip(prompt.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, ' '), max);
}

/** 에이전트가 쓴 설명 중 첫 문단만 */
export function firstParagraph(textBody: string, max = 160): string {
  const para = textBody.trim().split(/\n\s*\n/)[0] ?? '';
  return clip(para.replace(/[#*`>]/g, ''), max);
}

function text(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  return typeof v === 'string' ? v.trim() : '';
}

function clip(value: string, max = MAX_TARGET): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
}


function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return clip(url);
  }
}
