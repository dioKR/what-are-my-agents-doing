// 에이전트 상태(AgentSnapshot)를 보고 캐릭터를 어느 방으로 걸어가게 할지 정한다.
// 서버 상태는 순간순간 바뀌지만, 캐릭터는 걸어서 움직이므로 여기서 이동과 머무는 시간을 관리한다.
import { danceFacingAt } from './dance.ts';
import type { Activity, AgentSnapshot, ToolKind } from '../../../shared/protocol.ts';
import { BEDS, COURIER_STAND, DANCE_SPOTS, HEAD_SEAT, LIBRARY_SPOTS, LOUNGE_SPOTS, MAIL_STAND, MEETING_SEATS, OUTSIDE, SEATS, SERVER_SPOTS, WANDER_AREA, findPath, isWalkable, type Spot } from './map.ts';
import { lookFor, type Look } from './look.ts';
import type { Accessory, DollLook, Facing } from './character/doll.ts';
import { findRecipients, teamsOf, type TeamSeat } from './team.ts';

const WALK_SPEED = 3.6; // 칸/초
const COURIER_SPEED = WALK_SPEED * 1.2;
const MIN_STAY_SECONDS = 2.5; // 자료실·서버실 같은 곳에 도착하면 이만큼은 머문다 (너무 빨리 왔다 갔다 하지 않게)
const MAILBOX_ACTION_SECONDS = 0.7;
const COURIER_WAIT_SECONDS = 0.5;
/** 지시를 이만큼 넘게 기다리면 자리를 비우고 탕비실에서 쉰다 (일하는 세션만 개발실에 남도록) */
const LOUNGE_AFTER_MS = 90_000;
/** 컨텍스트를 이만큼 넘게 쓴 에이전트는 ??? 방에 올라가 춤춘다 (곧 요약해야 한다는 신호) */
const CLUB_CONTEXT_RATIO = 0.8;
/** 컨텍스트가 차도 이 상태일 때는 원래 가던 곳으로 간다 (요약 중이면 수면실, 끝났으면 퇴근) */
const NOT_FOR_CLUB: ReadonlySet<Activity> = new Set(['compacting', 'ended']);
/** 춤출 때 도는 방향 (박자마다 하나씩) */
/** 한 턴을 마치면 이만큼 웃는다 */
const CHEER_SECONDS = 3;
const PROUD_SECONDS = 4;
/** 팀원이 메시지를 보내면 그 말풍선을 이만큼 띄운다 */
const SAY_SECONDS = 5;
/** CEO 지시가 들어오면 리더 말풍선을 이만큼, 팀원들은 리더 쪽을 이만큼 본다 */
const ANNOUNCE_SECONDS = 6;
const LOOK_AT_LEAD_SECONDS = 4;
const FLIGHT_SECONDS = 1.3;
const INTERN_GAP = 0.9; // 인턴끼리 띄우는 간격 (칸)
/** 역할마다 기본으로 쓰는 소품 (꾸미기로 바꾸지 않았을 때) */
const ROLE_ACCESSORY: Record<string, Accessory> = { lead: 'crown', po: 'glasses', pm: 'ribbon', design: 'beret', fe: 'headphones', be: 'cap', infra: 'starclip' };

export type Place = 'desk' | 'bed' | 'library' | 'server' | 'lounge' | 'meeting' | 'club' | 'wander' | 'exit';

const PLACE_BY_ACTIVITY: Record<Activity, Place> = {
  working: 'desk',
  thinking: 'desk',
  'waiting-permission': 'desk',
  'waiting-user': 'desk',
  'mail-send': 'desk', // 우편함 장면은 우편 기록이 새로 생길 때 따로 재생한다
  'mail-read': 'desk',
  compacting: 'bed',
  researching: 'library',
  background: 'server',
  stuck: 'wander',
  ended: 'exit'
};

interface MailScene { direction: 'sent' | 'read'; phase: 'going' | 'atBox' | 'returning'; t: number }

/** 도착한 곳에서 바라볼 방향: 책장·서버는 등을 보이고 그 앞에 선다 */
const FACING_AT: Record<Exclude<Place, 'meeting'>, Facing> = { desk: 'down', bed: 'down', library: 'up', server: 'up', lounge: 'down', club: 'down', wander: 'down', exit: 'down' };

/** 팀 행동에서 이 장소들은 혼자 일할 때와 같다 (자료실·서버실에 다녀온다) */
const TEAM_ERRANDS: ReadonlySet<Activity> = new Set(['researching', 'background', 'ended']);

export interface Flight { fromId: string; toId: string; t: number }

export class Actor {
  x: number;
  y: number;
  path: Spot[] = [];
  place: Place = 'desk';
  stayLeft = 0;
  scene: MailScene | null = null;
  carrying: 'parcel' | 'letter' | null = null;
  readonly queuedScenes: Array<MailScene['direction']> = [];
  readonly seenMailIds = new Set<string>();
  removed = false;
  facing: Facing = 'down';
  /** 0보다 크면 웃는 얼굴 (초) */
  cheerLeft = 0;
  /** 코인을 많이 벌어 뿌듯해하는 남은 시간(초) */
  proudLeft = 0;
  lastActivity: Activity | null = null;
  /** 몇 번째로 나타난 에이전트인지 (기본 생김새를 정할 때 쓴다) */
  appearanceIndex = 0;
  /** 팀에 속해 있으면 회의실 자리 (리더는 CEO 자리). 혼자 일하면 null */
  teamSeat: TeamSeat | null = null;
  teamRole: 'lead' | 'member' | null = null;
  /** 팀원이 일을 받았는지. 받기 전에는 회의실에서 기다리고, 받은 뒤에는 일하는 동안 흩어진다. */
  hasAssignment = false;
  /** 머리 위에 잠깐 띄울 말 (팀원 메시지, CEO 지시) */
  say: { text: string; kind: 'message' | 'ceo'; to?: string; until: number } | null = null;
  /** 이 시각까지는 이쪽을 본다 (지시하는 리더 쪽 돌아보기) */
  lookAt: { facing: Facing; until: number } | null = null;
  lastRequest: string | null = null;
  readonly seenMessageIds = new Set<string>();

  readonly id: string;
  readonly tool: ToolKind;
  /** 몇 번째 자리·침대를 쓰는지 */
  readonly slot: number;
  /** 꾸미기로 바뀔 수 있다 */
  look: Look;

  constructor(id: string, tool: ToolKind, slot: number, look: Look, walkIn: boolean) {
    this.id = id; this.tool = tool; this.slot = slot; this.look = look;
    // 일하는 도중에 새로 생긴 에이전트는 회사 밖에서 걸어 들어오고, 화면을 처음 열 때 이미 있던 에이전트는 자리에서 시작한다
    const start = walkIn ? OUTSIDE : this.seat;
    this.x = start.x; this.y = start.y;
    this.path = walkIn ? findPath(OUTSIDE, this.seat) : [];
  }

  get seat(): Spot { return SEATS[this.slot % SEATS.length]; }
  get bed(): Spot { return BEDS[this.slot % BEDS.length]; }
  get isMoving(): boolean { return this.path.length > 0; }
  /** 돌아갈 자리: 리더와 회의실에 모인 팀원은 회의실 자리, 그 밖에는 개발실 책상 */
  get home(): Spot {
    const atMeeting = this.teamRole === 'lead' || this.place === 'meeting';
    return atMeeting ? this.teamSeat ?? this.seat : this.seat;
  }
  /**
   * 하위 에이전트(인턴)가 서는 i번째 자리의 발 위치(타일). 지금 앉는 자리 옆에 둔다.
   * 리더 자리는 회의실 동쪽 벽에 붙어 있어 오른쪽이 막히므로 아래로 줄 세운다.
   */
  internSpot(index: number): { x: number; y: number } {
    const { x, y } = this.home;
    if (this.teamRole === 'lead') return { x, y: y + 2 + index * INTERN_GAP };
    return { x: x + 2.4 + index * INTERN_GAP, y: y + 1 };
  }
  get isSeated(): boolean { return (this.place === 'desk' || this.place === 'meeting') && !this.isMoving && !this.scene; }
  get isAsleep(): boolean { return this.place === 'bed' && !this.isMoving; }
  get isDancing(): boolean { return this.place === 'club' && !this.isMoving && !this.scene; }
  get isGone(): boolean { return this.removed && !this.isMoving; }

  spotFor(place: Place): Spot {
    switch (place) {
      case 'desk': return this.seat;
      case 'meeting': return this.teamSeat ?? this.seat;
      case 'bed': return this.bed;
      case 'library': return LIBRARY_SPOTS[this.slot % LIBRARY_SPOTS.length];
      case 'server': return SERVER_SPOTS[this.slot % SERVER_SPOTS.length];
      case 'lounge': return LOUNGE_SPOTS[this.slot % LOUNGE_SPOTS.length];
      case 'club': return DANCE_SPOTS[this.slot % DANCE_SPOTS.length];
      case 'exit': return OUTSIDE;
      case 'wander': return randomWanderSpot();
    }
  }

  walkTo(target: Spot): void { this.path = findPath(this, target); }

  /** dt초만큼 걷는다. 이번에 목적지에 막 도착했으면 true (도착하면 그곳에 맞는 방향을 본다) */
  step(dt: number): boolean {
    const wasMoving = this.isMoving;
    walkAlongPath(this, WALK_SPEED * dt);
    const arrived = wasMoving && !this.isMoving;
    if (arrived) this.facing = this.scene ? 'down' : this.place === 'meeting' ? this.teamSeat?.facing ?? 'down' : FACING_AT[this.place];
    return arrived;
  }
}

interface Walker { x: number; y: number; path: Spot[]; facing: Facing }

/** 경로를 따라 distance칸만큼 이동한다. 지나간 칸은 경로에서 빼고, 가는 쪽을 바라본다. */
function walkAlongPath(walker: Walker, distance: number): void {
  let left = distance;
  while (left > 0 && walker.path.length) {
    const next = walker.path[0];
    const dx = next.x - walker.x, dy = next.y - walker.y, dist = Math.hypot(dx, dy);
    if (dist > 0) walker.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (dist <= left) { walker.x = next.x; walker.y = next.y; walker.path.shift(); left -= dist; }
    else { walker.x += (dx / dist) * left; walker.y += (dy / dist) * left; left = 0; }
  }
}

function wantedPlace(agent: AgentSnapshot, actor: Actor, now: number): Place {
  // 컨텍스트가 80% 넘게 찬 에이전트는 무엇을 하든 ??? 방에서 춤춘다 (리더·팀원 포함)
  const contextAlmostFull = (agent.contextUsedRatio ?? 0) >= CLUB_CONTEXT_RATIO;
  if (contextAlmostFull && !NOT_FOR_CLUB.has(agent.activity)) return 'club';
  // 리더는 CEO 자리를 지키고, 팀원은 일을 받기 전과 일을 마치고 기다릴 때만 회의실에 모인다
  const staysInMeeting = actor.teamRole === 'lead' || (actor.teamRole === 'member' && (!actor.hasAssignment || agent.activity === 'waiting-user'));
  if (staysInMeeting) return TEAM_ERRANDS.has(agent.activity) ? PLACE_BY_ACTIVITY[agent.activity] : 'meeting';
  const idleLong = agent.activity === 'waiting-user' && now - agent.updatedAt > LOUNGE_AFTER_MS;
  return idleLong ? 'lounge' : PLACE_BY_ACTIVITY[agent.activity];
}

function randomWanderSpot(): Spot {
  for (let tries = 0; tries < 20; tries++) {
    const x = WANDER_AREA.x0 + Math.floor(Math.random() * (WANDER_AREA.x1 - WANDER_AREA.x0 + 1));
    const y = WANDER_AREA.y0 + Math.floor(Math.random() * (WANDER_AREA.y1 - WANDER_AREA.y0 + 1));
    if (isWalkable(x, y)) return { x, y };
  }
  return SEATS[0];
}

/** 우편 배달부: 에이전트가 우편함에 넣은 문서를 밖으로 가져간다 */
export class Courier {
  x = OUTSIDE.x;
  y = OUTSIDE.y;
  path: Spot[] = [];
  facing: Facing = 'up';
  state: 'away' | 'coming' | 'waiting' | 'leaving' = 'away';
  carrying = false;
  private pickups = 0;
  private waitLeft = 0;

  get isVisible(): boolean { return this.state !== 'away'; }
  get hasMailWaiting(): boolean { return this.pickups > 0 || this.state === 'coming' || this.state === 'waiting'; }

  requestPickup(): void { this.pickups++; }

  update(dt: number): void {
    walkAlongPath(this, COURIER_SPEED * dt);
    if (this.path.length) return;
    if (this.state === 'away' && this.pickups > 0) {
      this.pickups--;
      this.x = OUTSIDE.x; this.y = OUTSIDE.y;
      this.path = findPath(OUTSIDE, COURIER_STAND);
      this.state = 'coming';
    } else if (this.state === 'coming') {
      this.state = 'waiting'; this.waitLeft = COURIER_WAIT_SECONDS;
    } else if (this.state === 'waiting') {
      this.waitLeft -= dt;
      if (this.waitLeft <= 0) { this.carrying = true; this.path = findPath(this, OUTSIDE); this.state = 'leaving'; }
    } else if (this.state === 'leaving') {
      this.carrying = false; this.state = 'away';
    }
  }
}

/** 서버에서 온 에이전트 목록에 맞춰 캐릭터를 만들고 없애고 움직인다 */
export class ActorDirector {
  readonly actors = new Map<string, Actor>();
  readonly courier = new Courier();
  /** 팀원 사이를 날아가는 편지 */
  flights: Flight[] = [];
  /** 연출용 시계 (초) */
  private clock = 0;
  /** 지금까지 나타난 에이전트 수. 기본 캐릭터를 번갈아 입히는 데 쓴다 */
  private appearances = 0;
  /** 사용자가 꾸민 생김새를 돌려주는 함수 (없으면 도구 기본 모습) */
  private readonly customLookOf: (agent: AgentSnapshot) => Partial<DollLook> | undefined;

  constructor(customLookOf: (agent: AgentSnapshot) => Partial<DollLook> | undefined = () => undefined) {
    this.customLookOf = customLookOf;
  }

  /** 꾸미기를 바꾼 뒤 부른다 */
  refreshLook(agent: AgentSnapshot): void {
    const actor = this.actors.get(agent.id);
    if (actor) actor.look = this.lookOf(actor, agent);
  }

  private lookOf(actor: Actor, agent: AgentSnapshot): Look {
    const roleAccessory = ROLE_ACCESSORY[actor.teamRole === 'lead' ? 'lead' : agent.role ?? ''];
    return lookFor(actor.appearanceIndex, { ...(roleAccessory ? { accessory: roleAccessory } : {}), ...this.customLookOf(agent) });
  }

  /** 회의실 자리 배정, CEO 지시와 팀원 메시지 연출 */
  private syncTeams(agents: AgentSnapshot[], firstLoad: boolean): void {
    const teams = teamsOf(agents);
    const byId = new Map(agents.map((a) => [a.id, a]));
    for (const actor of this.actors.values()) {
      const team = teams.byAgent.get(actor.id);
      const role = team ? (team.leadId === actor.id ? 'lead' : 'member') : null;
      const seat = team ? (role === 'lead' ? { ...HEAD_SEAT, facing: 'left' as const } : MEETING_SEATS[team.memberIds.indexOf(actor.id) % MEETING_SEATS.length]) : null;
      const changed = role !== actor.teamRole || seat?.x !== actor.teamSeat?.x || seat?.y !== actor.teamSeat?.y;
      actor.teamRole = role;
      actor.teamSeat = seat;
      const agent = byId.get(actor.id);
      if (changed && agent) actor.look = this.lookOf(actor, agent);
      // 팀에 들어가거나 자리가 바뀌면, 가던 길(개발실 책상)을 멈추고 바로 회의실 자리로 간다. 흩어져 일하는 팀원은 일을 마치고 돌아올 때 새 자리로 간다.
      const isOutWorking = role === 'member' && actor.hasAssignment && actor.place !== 'meeting';
      if (changed && seat && !isOutWorking && !actor.removed && !actor.scene) {
        actor.place = 'meeting';
        if (firstLoad) { actor.x = seat.x; actor.y = seat.y; actor.path = []; actor.facing = seat.facing; }
        else actor.walkTo(seat);
      }
    }
    for (const team of teams.list) {
      const lead = this.actors.get(team.leadId);
      const leadAgent = byId.get(team.leadId);
      if (lead && leadAgent && leadAgent.request !== lead.lastRequest) {
        if (lead.lastRequest !== null && leadAgent.request && !firstLoad) this.announce(lead, leadAgent.request, team.memberIds);
        lead.lastRequest = leadAgent.request;
      }
      for (const id of [team.leadId, ...team.memberIds]) {
        const actor = this.actors.get(id);
        const agent = byId.get(id);
        if (!actor || !agent) continue;
        for (const message of [...agent.messages].reverse()) {
          if (actor.seenMessageIds.has(message.id)) continue;
          actor.seenMessageIds.add(message.id);
          const recipients = findRecipients(team, id, message.to, byId);
          // 리더나 이미 일을 받은 팀원에게서 메시지를 받으면 일을 받은 것으로 본다 (CEO는 북극성 지표만 주고, 일은 팀 안에서 나뉜다)
          const isAssigning = id === team.leadId || actor.hasAssignment;
          if (isAssigning) recipients.forEach((toId) => { const recipient = this.actors.get(toId); if (recipient) recipient.hasAssignment = true; });
          if (firstLoad) continue;
          actor.say = { text: message.text, kind: 'message', to: message.to, until: this.clock + SAY_SECONDS };
          recipients.forEach((toId) => this.flights.push({ fromId: id, toId, t: 0 }));
        }
      }
    }
  }

  /** CEO(사람)가 리더에게 지시하면 리더가 말하고, 팀원들이 리더 쪽을 돌아본다 */
  private announce(lead: Actor, request: string, memberIds: string[]): void {
    lead.say = { text: request, kind: 'ceo', until: this.clock + ANNOUNCE_SECONDS };
    for (const id of memberIds) {
      const member = this.actors.get(id);
      if (member) member.lookAt = { facing: 'right', until: this.clock + LOOK_AT_LEAD_SECONDS };
    }
  }

  /** 지금 이 캐릭터가 바라봐야 하는 방향 (리더 쪽 돌아보기가 걷기보다 우선은 아니다) */
  facingOf(actor: Actor): Facing {
    if (actor.isDancing) return danceFacingAt(actor.slot, this.clock);
    if (actor.lookAt && actor.lookAt.until > this.clock && !actor.isMoving) return actor.lookAt.facing;
    return actor.facing;
  }

  /** 말풍선으로 띄울 팀 메시지·지시 (없거나 지났으면 null) */
  activeSay(actor: Actor): Actor['say'] {
    return actor.say && actor.say.until > this.clock ? actor.say : null;
  }

  /** firstLoad: 화면을 처음 열었을 때 받은 목록이면 true (캐릭터가 걸어 들어오지 않고 자리에서 시작) */
  sync(agents: Iterable<AgentSnapshot>, firstLoad = false): void {
    const alive = new Set<string>();
    const agentsList = [...agents];
    for (const agent of agentsList) {
      alive.add(agent.id);
      const actor = this.actors.get(agent.id) ?? this.addActor(agent, !firstLoad);
      this.queueNewMail(actor, agent);
    }
    for (const actor of this.actors.values()) {
      if (!alive.has(actor.id) && !actor.removed) this.leave(actor);
    }
    this.syncTeams([...agentsList], firstLoad);
  }

  /** now: 지금 시각(ms). 에이전트가 얼마나 오래 쉬고 있는지 잴 때 쓴다 */
  update(dt: number, agents: ReadonlyMap<string, AgentSnapshot>, now: number): void {
    this.clock += dt;
    this.flights = this.flights.map((f) => ({ ...f, t: f.t + dt / FLIGHT_SECONDS })).filter((f) => f.t < 1);
    for (const actor of this.actors.values()) {
      const agent = agents.get(actor.id);
      actor.cheerLeft = Math.max(0, actor.cheerLeft - dt);
      actor.proudLeft = Math.max(0, actor.proudLeft - dt);
      if (agent) this.noticeActivityChange(actor, agent.activity);
      if (actor.removed) actor.step(dt);
      else if (actor.scene) this.runMailScene(actor, dt);
      else if (agent) this.followActivity(actor, wantedPlace(agent, actor, now), dt);
      if (actor.isGone) this.actors.delete(actor.id);
    }
    this.courier.update(dt);
  }

  /** PR · git push · 팀 할 일처럼 코인을 많이 번 순간 잠깐 별 눈을 한다 */
  celebrate(agentId: string): void {
    const actor = this.actors.get(agentId);
    if (actor) actor.proudLeft = PROUD_SECONDS;
  }

  private noticeActivityChange(actor: Actor, activity: Activity): void {
    const finishedTurn = activity === 'waiting-user' && (actor.lastActivity === 'working' || actor.lastActivity === 'thinking');
    if (finishedTurn) actor.cheerLeft = CHEER_SECONDS;
    actor.lastActivity = activity;
  }

  private addActor(agent: AgentSnapshot, walkIn: boolean): Actor {
    const usedSlots = new Set([...this.actors.values()].filter((a) => !a.removed).map((a) => a.slot));
    let slot = 0;
    while (usedSlots.has(slot)) slot++;
    const appearance = this.appearances++;
    const actor = new Actor(agent.id, agent.tool, slot, lookFor(appearance, this.customLookOf(agent)), walkIn);
    actor.appearanceIndex = appearance;
    actor.look = this.lookOf(actor, agent);
    // 처음 보는 에이전트의 지난 우편 기록은 장면으로 다시 틀지 않는다
    agent.mail.forEach((m) => actor.seenMailIds.add(m.id));
    this.actors.set(agent.id, actor);
    return actor;
  }

  private queueNewMail(actor: Actor, agent: AgentSnapshot): void {
    for (const record of [...agent.mail].reverse()) {
      if (actor.seenMailIds.has(record.id)) continue;
      actor.seenMailIds.add(record.id);
      actor.queuedScenes.push(record.direction);
    }
  }

  private leave(actor: Actor): void {
    actor.removed = true;
    actor.scene = null;
    actor.carrying = null;
    actor.walkTo(OUTSIDE);
  }

  private followActivity(actor: Actor, wanted: Place, dt: number): void {
    const arrived = actor.step(dt);
    if (arrived && actor.place !== 'desk' && actor.place !== 'meeting') actor.stayLeft = MIN_STAY_SECONDS;
    actor.stayLeft = Math.max(0, actor.stayLeft - dt);
    if (actor.stayLeft > 0 || actor.isMoving) return;

    const canStartScene = actor.queuedScenes.length > 0 && actor.place !== 'bed';
    if (canStartScene) { this.startMailScene(actor, actor.queuedScenes.shift()!); return; }

    const wanderAgain = wanted === 'wander' && actor.place === 'wander';
    if (wanted !== actor.place || wanderAgain) {
      actor.place = wanted;
      actor.walkTo(actor.spotFor(wanted));
    }
  }

  private startMailScene(actor: Actor, direction: MailScene['direction']): void {
    actor.scene = { direction, phase: 'going', t: 0 };
    actor.carrying = direction === 'sent' ? 'parcel' : null;
    if (actor.place !== 'meeting') actor.place = 'desk';
    actor.walkTo(MAIL_STAND);
  }

  private runMailScene(actor: Actor, dt: number): void {
    const scene = actor.scene!;
    actor.step(dt);
    if (scene.phase === 'going' && !actor.isMoving) {
      scene.phase = 'atBox'; scene.t = 0;
    } else if (scene.phase === 'atBox') {
      scene.t += dt;
      if (scene.t < MAILBOX_ACTION_SECONDS) return;
      if (scene.direction === 'sent') { actor.carrying = null; this.courier.requestPickup(); }
      else actor.carrying = 'letter';
      scene.phase = 'returning';
      actor.walkTo(actor.home);
    } else if (scene.phase === 'returning' && !actor.isMoving) {
      actor.scene = null;
      actor.carrying = null;
    }
  }
}
