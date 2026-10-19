// 서버와 화면이 함께 쓰는 약속. 여기 모양이 바뀌면 양쪽이 같이 바뀌어야 한다.
import type { AppSettings, ApprovalAsk } from './approvals.ts';
import type { CustomCharacter } from './characterSheet.ts';
import type { RecordsState } from './records.ts';
import type { WalletState } from './shop.ts';

export const SERVER_PORT = 4545;

export type ToolKind = 'claude-code' | 'codex' | 'gemini';

/** 에이전트가 지금 무엇을 하는지. 화면은 이 값으로 캐릭터가 어느 방에 있을지 정한다. */
export type Activity =
  | 'working' // 도구를 쓰는 중 (파일 읽기·수정·명령 실행)
  | 'thinking' // 도구 사이에서 다음 할 일을 정하는 중
  | 'waiting-permission' // 사람의 승인을 기다리는 중
  | 'waiting-user' // 할 일을 마치고 다음 지시를 기다리는 중
  | 'compacting' // 컨텍스트를 요약(compact)하는 중
  | 'researching' // 웹 검색·웹 문서 읽기
  | 'background' // 백그라운드 명령을 거는 중
  | 'mail-send' // Slack·메일로 보내는 중
  | 'mail-read' // Slack·메일을 읽는 중
  | 'stuck' // 같은 실패를 반복하는 중
  | 'ended'; // 세션 종료

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface MailRecord {
  id: string;
  at: number;
  direction: 'sent' | 'read';
  /** 'Slack', 'Gmail' 같은 통로 이름 */
  channel: string;
  /** 받는 곳이나 검색어 등 사람이 알아볼 짧은 설명 */
  target: string;
  /** 보낸 내용 앞부분 */
  preview: string;
}

/** 화면 언어에 맞춰 고를 수 있게 한국어·영어를 함께 담은 문장 */
export interface LocalText {
  ko: string;
  en: string;
}

/** 에이전트가 알려 준 링크 (PR, 로컬 서버, 웹 주소) */
export interface AgentLink {
  url: string;
  label: LocalText;
  kind: 'pr' | 'local' | 'web';
  at: number;
}

/** 팀원끼리 주고받은 메시지 (보낸 쪽 상태에 쌓인다) */
export interface TeamMessage {
  id: string;
  /** 받는 팀원 이름 (팀원 이름·역할 또는 'team-lead', '*'는 전체) */
  to: string;
  text: string;
  at: number;
}

/** 팀 할 일 (리더 상태에 쌓인다) */
export interface TeamTask {
  id: string;
  subject: string;
  owner: string | null;
  status: 'open' | 'done';
  at: number;
}

export interface ActivityLogItem {
  at: number;
  text: LocalText;
}

export interface SubagentInfo {
  id: string;
  label: string;
  startedAt: number;
}

export interface AgentSnapshot {
  id: string;
  tool: ToolKind;
  /** 지금 작업 중인 폴더 (에이전트가 cd 하면 바뀐다) */
  cwd: string;
  /** 세션을 시작한 프로젝트 폴더. 이름·꾸민 모습·상점 착용을 이 폴더 기준으로 기억한다. 모르면 null (그때는 cwd를 쓴다) */
  projectDir: string | null;
  /** Claude Code에서 붙은 세션 제목 (예: "A/B 테스트 설계 및 구현"). 모르면 null */
  title: string | null;
  /** 팀원이면 리더(나와 대화하는 세션)의 id. 혼자 일하는 에이전트면 null */
  parentId: string | null;
  /** 팀원의 역할(에이전트 타입). 예: 'fe', 'be', 'pm' */
  role: string | null;
  /** 팀원 이름 (메시지를 주고받을 때 부르는 이름) */
  memberName: string | null;
  activity: Activity;
  /** 지금 하는 일을 도구 이름 그대로. 예: "Edit src/app.ts" */
  detail: string;
  /** 지금 하는 일을 사람 말로. 예: "src/app.ts 고치는 중" */
  summary: LocalText;
  /** 사람이 마지막으로 시킨 요청 */
  request: string | null;
  /** 에이전트가 작업하며 마지막으로 남긴 설명 (첫 문단) */
  narration: string | null;
  /** 최근에 한 일, 새것부터 */
  recent: ActivityLogItem[];
  /** 에이전트가 알려 준 링크, 새것부터 */
  links: AgentLink[];
  /** 이 에이전트가 팀원에게 보낸 메시지, 새것부터 */
  messages: TeamMessage[];
  /** (리더만) 팀 할 일 목록 */
  teamTasks: TeamTask[];
  /** 0~1. 알 수 없으면 null */
  contextUsedRatio: number | null;
  todos: TodoItem[];
  subagents: SubagentInfo[];
  mail: MailRecord[];
  failStreak: number;
  /** 앱에서 권한 질문을 마지막으로 거부당한 시각 (거부당한 적 없으면 없음). 잠깐 우는 얼굴을 한다 */
  deniedAt?: number;
  startedAt: number;
  updatedAt: number;
}

/** 팀 메시지의 받는 사람이 '팀 전체'인지 (agent teams는 '*'로 전체에게 보낸다) */
const BROADCAST_RECIPIENTS = new Set(['*', 'all', 'everyone', 'team']);
export const isBroadcastRecipient = (to: string): boolean => BROADCAST_RECIPIENTS.has(to.trim().toLowerCase());

/** 서버와 화면이 주고받는 모양의 판 번호. 모양을 바꾸면 올린다 (예전 화면이 열려 있으면 스스로 새로고침한다) */
export const PROTOCOL_VERSION = 6;

export type ServerMessage =
  | { type: 'snapshot'; protocol: number; agents: AgentSnapshot[] }
  | { type: 'agent'; agent: AgentSnapshot }
  | { type: 'removed'; id: string }
  /** 지갑(코인·산 물건·착용)이 바뀌었다 */
  | { type: 'wallet'; wallet: WalletState }
  /** 에이전트가 일해서 코인을 벌었다 (캐릭터 머리 위에 +코인을 띄운다) */
  | { type: 'reward'; agentId: string; amount: number }
  /** 기록실(최고 기록 · 누적 작업량)이 바뀌었다 */
  | { type: 'records'; records: RecordsState }
  /** 사용자가 올린 캐릭터 시트 목록이 바뀌었다 */
  | { type: 'characters'; characters: CustomCharacter[] }
  /** 앱 설정이 바뀌었다 */
  | { type: 'settings'; settings: AppSettings }
  /** 앱에서 대답을 기다리는 권한 질문 목록이 바뀌었다 */
  | { type: 'approvals'; asks: ApprovalAsk[] };

/** 같은 실패가 이 횟수 이상 이어지면 'stuck'으로 본다 */
export const STUCK_FAIL_STREAK = 5;
