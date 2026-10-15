// 한 프레임을 그린다: 바닥·벽 → 창문 → (가구·침대·캐릭터를 아래쪽에 있는 것부터) → 머리 위 아이콘 → 선택 표시 → 조명.
import { danceMoveAt } from './dance.ts';
import type { Activity, AgentSnapshot } from '../../../shared/protocol.ts';
import { BEDS, LIGHTS, TILE, WINDOWS, furniture } from './map.ts';
import { drawBed, drawFurniture, drawWindow, type BoardCard, type FurnitureContext } from './furnitureArt.ts';
import { COURIER_LOOK, subagentLook, type Look } from './look.ts';
import { DOLL_FOOT_Y, DOLL_H, DOLL_W, dollFrame, type Expression, type Facing, type Pose } from './character/doll.ts';
import { drawIcon, drawLetter, drawParcel, type IconKey } from './props.ts';
import { drawLighting, type Ambient, type LightSource } from './lighting.ts';
import type { Actor, ActorDirector } from './actors.ts';
import { drawPet, petDepth, type Pet } from './pets/pets.ts';

const FOOT_Y = DOLL_FOOT_Y;
/** 걷기 4박자: 왼발 → 모음(몸이 1px 뜸) → 오른발 → 모음 */
const WALK_CYCLE: ReadonlyArray<{ pose: Pose; lift: number }> = [{ pose: 'walk1', lift: 0 }, { pose: 'stand', lift: 1 }, { pose: 'walk2', lift: 0 }, { pose: 'stand', lift: 1 }];
const WALK_BEATS_PER_SECOND = 8;
const walkBeat = (time: number, offset = 0) => WALK_CYCLE[Math.floor(time * WALK_BEATS_PER_SECOND + offset) % WALK_CYCLE.length];
const SEATED_DROP = 7; // 앉으면 책상에 허리 아래가 가려지도록 내린다
const SLEEP_HEAD_ROWS = 27; // 침대에서는 머리만 보인다 (위 여백 4줄 + 머리 23줄)
/** 자는 머리를 베개 높이에 맞추려고 침대 윗변보다 이만큼 위에서 그린다 */
const SLEEP_HEAD_RAISE = 5;
/** 이불 윗단 (침대 윗변에서 아래로). 얼굴이 이불에 덮이지 않도록 턱 아래에서 시작한다 */
const BLANKET_TOP = 19;
const MAX_SUBAGENTS_SHOWN = 3;
const SHADOW_W = 16;
/** 들고 가는 상자·편지의 너비 (props.ts) */
const CARRIED_W = 14;
const BLINK_EVERY = 3.6;
const BLINK_LENGTH = 0.16;
const STRETCH_EVERY = 9;
const STRETCH_LENGTH = 1.4;
const SIP_EVERY = 7;
const SIP_LENGTH = 2.5;

export interface RenderInput {
  g: CanvasRenderingContext2D;
  floor: HTMLCanvasElement;
  lightLayer: HTMLCanvasElement;
  director: ActorDirector;
  agents: ReadonlyMap<string, AgentSnapshot>;
  selectedId: string | null;
  time: number;
  reduceMotion: boolean;
  ambient: Ambient;
  /** 캐릭터를 따라다니는 펫들 */
  pets: Iterable<Pet>;
}

/** 캐릭터 그림의 왼쪽 위 좌표 (지도 픽셀 단위). 이름표·말풍선·클릭 판정도 이 값을 쓴다. */
export function actorBox(actor: Actor): { x: number; y: number } {
  if (actor.isAsleep) return { x: actor.bed.x * TILE - (DOLL_W - TILE) / 2, y: actor.bed.y * TILE - SLEEP_HEAD_RAISE };
  const drop = actor.isSeated ? SEATED_DROP : 0;
  return { x: Math.round(actor.x * TILE + TILE / 2 - DOLL_W / 2), y: Math.round(actor.y * TILE + TILE - 2 - FOOT_Y) + drop };
}

export function renderOffice(input: RenderInput): void {
  const { g, director, agents, time, ambient } = input;
  g.drawImage(input.floor, 0, 0);
  WINDOWS.forEach((w) => drawWindow(g, w.x, w.y, ambient.sky, ambient.night));

  const furnitureContext: FurnitureContext = {
    time,
    reduceMotion: input.reduceMotion,
    serverBusy: [...agents.values()].some((a) => a.activity === 'background'),
    mailboxHasItem: director.courier.hasMailWaiting,
    boardCards: collectBoardCards(director, agents),
    night: ambient.night,
    teamProgress: teamProgressOf(agents)
  };

  const drawables: Array<{ depth: number; draw: () => void }> = [];
  for (const f of furniture) drawables.push({ depth: f.depth, draw: () => drawFurniture(g, f, furnitureContext) });
  BEDS.forEach((bed, slot) => {
    const owner = [...director.actors.values()].find((a) => !a.removed && a.slot % BEDS.length === slot);
    drawables.push({ depth: (bed.y + 2) * TILE - 0.5, draw: () => drawBed(g, bed.x, bed.y, owner?.look.accent ?? '#8a8f98', owner?.look.accentLight ?? '#b5bac2') });
  });
  for (const actor of director.actors.values()) {
    const agent = agents.get(actor.id);
    const box = actorBox(actor);
    const depth = actor.isAsleep ? (actor.bed.y + 2) * TILE : box.y + FOOT_Y;
    drawables.push({ depth, draw: () => drawActor(input, actor, agent) });
    agent?.subagents.slice(0, MAX_SUBAGENTS_SHOWN).forEach((_, i) => {
      const spot = actor.internSpot(i);
      const x = Math.round(spot.x * TILE - DOLL_W / 2);
      const y = Math.round(spot.y * TILE - 2 - FOOT_Y);
      const pose: Pose = Math.floor(time * 3 + i) % 2 ? 'type1' : 'type2';
      drawables.push({ depth: y + FOOT_Y, draw: () => drawDoll(g, subagentLook(actor.look), 'left', pose, 'focus', x, y) });
    });
  }
  const courier = director.courier;
  if (courier.isVisible) {
    const x = Math.round(courier.x * TILE + TILE / 2 - DOLL_W / 2), y = Math.round(courier.y * TILE + TILE - 2 - FOOT_Y);
    const beat = courier.path.length && !input.reduceMotion ? walkBeat(time) : { pose: 'stand' as Pose, lift: 0 };
    const pose: Pose = courier.carrying ? 'carry' : beat.pose;
    drawables.push({ depth: y + FOOT_Y, draw: () => {
      drawDoll(g, COURIER_LOOK, courier.facing, pose, 'normal', x, y - beat.lift);
      if (courier.carrying) drawParcel(g, x + 5, y - 7 - beat.lift);
    } });
  }
  for (const pet of input.pets) drawables.push({ depth: petDepth(pet), draw: () => drawPet(g, pet, time, input.reduceMotion) });
  drawables.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());
  drawFlights(g, director);

  for (const actor of director.actors.values()) {
    const agent = agents.get(actor.id);
    const icon = agent && iconFor(agent, actor);
    if (!icon) continue;
    const box = actorBox(actor);
    drawIcon(g, icon, box.x + DOLL_W / 2, box.y + 3);
  }
  const selected = input.selectedId ? director.actors.get(input.selectedId) : undefined;
  if (selected) drawSelection(g, actorBox(selected));
  drawLighting(g, input.lightLayer, ambient, collectLights(director, agents));
}

function drawDoll(g: CanvasRenderingContext2D, look: Look, facing: Facing, pose: Pose, expression: Expression, x: number, y: number, rows = DOLL_H): void {
  g.drawImage(dollFrame(look.doll, facing, pose, expression), 0, 0, DOLL_W, rows, x, y, DOLL_W, rows);
}

function drawActor(input: RenderInput, actor: Actor, agent: AgentSnapshot | undefined): void {
  const { g } = input;
  const box = actorBox(actor);
  if (actor.isAsleep) {
    drawDoll(g, actor.look, 'down', 'stand', 'sleepy', box.x, box.y, SLEEP_HEAD_ROWS);
    drawBlanketOver(g, actor);
    return;
  }
  if (!actor.isSeated) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(box.x + (DOLL_W - SHADOW_W) / 2, box.y + FOOT_Y - 1, SHADOW_W, 3);
  }
  const { pose, expression, lift } = chooseFrame(actor, agent?.activity, input.time, input.reduceMotion);
  drawDoll(g, actor.look, input.director.facingOf(actor), pose, expression, box.x, box.y - lift);
  const carriedX = box.x + (DOLL_W - CARRIED_W) / 2;
  if (actor.carrying === 'parcel') drawParcel(g, carriedX, box.y - 3 - lift);
  if (actor.carrying === 'letter') drawLetter(g, carriedX, box.y - 3 - lift);
}

/** 자는 캐릭터 위로 이불을 덮는다: 접힌 윗단, 몸 굴곡, 아래 그늘 */
function drawBlanketOver(g: CanvasRenderingContext2D, actor: Actor): void {
  const X = actor.bed.x * TILE, Y = actor.bed.y * TILE;
  const { accent, accentLight } = actor.look;
  const top = Y + BLANKET_TOP, bottom = Y + 30;
  g.fillStyle = accent; g.fillRect(X + 1, top, 14, bottom - top);
  g.fillStyle = accentLight; g.fillRect(X + 1, top, 14, 3);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(X + 4, top + 4, 8, 3);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X + 1, bottom - 3, 14, 3); g.fillRect(X + 7, top + 3, 1, 5);
}

/** 지금 상태에 맞는 자세와 표정. 같은 상태라도 시간에 따라 기지개·커피 같은 작은 동작을 섞는다. */
function chooseFrame(actor: Actor, activity: Activity | undefined, time: number, reduceMotion: boolean): { pose: Pose; expression: Expression; lift: number } {
  const phase = time + actor.slot * 1.7;
  const every = (period: number, length: number) => !reduceMotion && phase % period < length;

  let pose: Pose = 'stand';
  let lift = 0;
  if (actor.isMoving && !reduceMotion) {
    const beat = walkBeat(time, actor.slot);
    pose = actor.carrying ? 'carry' : beat.pose;
    lift = beat.lift;
  } else if (actor.carrying) pose = 'carry';
  else if (actor.isSeated) {
    switch (activity) {
      case 'working': pose = Math.floor(time * 5 + actor.slot) % 2 ? 'type1' : 'type2'; break;
      case 'thinking': pose = 'think'; break;
      case 'waiting-permission': pose = 'raise'; break;
      default: pose = every(STRETCH_EVERY, STRETCH_LENGTH) ? 'stretch' : 'sit';
    }
  } else if (actor.isDancing && !reduceMotion) {
    const move = danceMoveAt(actor.slot, time);
    pose = move.pose; lift = move.lift;
  } else if (actor.place === 'lounge') pose = every(SIP_EVERY, SIP_LENGTH) ? 'drink' : 'stand';
  else if (actor.place === 'server') pose = Math.floor(time * 4) % 2 ? 'type1' : 'type2';

  let expression: Expression = 'normal';
  if (actor.isDancing) expression = 'happy';
  else if (activity === 'stuck') expression = 'panic';
  else if (actor.cheerLeft > 0) expression = 'happy';
  else if (activity === 'working' && actor.isSeated) expression = 'focus';
  const blinking = !reduceMotion && (time + actor.slot * 1.3) % BLINK_EVERY < BLINK_LENGTH;
  if (blinking && (expression === 'normal' || expression === 'focus')) expression = 'blink';
  // 서 있을 때는 숨 쉬듯 아주 살짝 들썩인다
  if (!actor.isMoving && !actor.isSeated && !actor.isDancing && every(1.6, 0.8)) lift = 1;
  return { pose, expression, lift };
}

const isMemberOnStandby = (agent: AgentSnapshot, actor: Actor) => agent.parentId !== null && actor.place === 'meeting';

function iconFor(agent: AgentSnapshot, actor: Actor): IconKey | null {
  if (actor.removed || actor.scene) return null;
  switch (agent.activity) {
    case 'waiting-permission': return 'ask';
    case 'stuck': return 'stuck';
    case 'compacting': return actor.isAsleep ? 'sleep' : null;
    case 'researching': return actor.isMoving ? null : 'book';
    // 회의실에서 기다리는 팀원은 원래 그 자리에서 대기하는 게 일이라 '?'를 띄우지 않는다 (리더는 내 지시를 기다리므로 띄운다)
    case 'waiting-user': return actor.isSeated && !isMemberOnStandby(agent, actor) ? 'wait' : null;
    default: return null;
  }
}

function collectBoardCards(director: ActorDirector, agents: ReadonlyMap<string, AgentSnapshot>): BoardCard[] {
  const cards: BoardCard[] = [];
  for (const agent of agents.values()) {
    const color = director.actors.get(agent.id)?.look.accent ?? '#8a8f98';
    agent.todos.forEach((todo) => cards.push({ color, status: todo.status }));
  }
  return cards;
}

/** 고정 조명 + 사람이 앉아 일하는 책상의 노트북 불빛 */
function collectLights(director: ActorDirector, agents: ReadonlyMap<string, AgentSnapshot>): LightSource[] {
  const screens: LightSource[] = [];
  for (const actor of director.actors.values()) {
    if (!actor.isSeated) continue;
    const busy = agents.get(actor.id)?.activity === 'working';
    screens.push({ x: (actor.seat.x + 1) * TILE, y: (actor.seat.y + 1) * TILE, r: busy ? 40 : 28, color: '140,230,255' });
  }
  return [...LIGHTS, ...screens];
}

/** 팀 할 일 진행: 모든 리더의 팀 할 일을 합친다. 팀이 없으면 null */
function teamProgressOf(agents: ReadonlyMap<string, AgentSnapshot>): { done: number; total: number } | null {
  const tasks = [...agents.values()].flatMap((a) => a.teamTasks);
  if (!tasks.length) return null;
  return { done: tasks.filter((t) => t.status === 'done').length, total: tasks.length };
}

/** 팀원 사이를 포물선으로 날아가는 편지 */
function drawFlights(g: CanvasRenderingContext2D, director: ActorDirector): void {
  const ARC_HEIGHT = 22;
  for (const flight of director.flights) {
    const from = director.actors.get(flight.fromId), to = director.actors.get(flight.toId);
    if (!from || !to) continue;
    const a = actorBox(from), b = actorBox(to);
    const x = a.x + (b.x - a.x) * flight.t + DOLL_W / 2 - 7;
    const y = a.y + (b.y - a.y) * flight.t + 6 - Math.sin(Math.PI * flight.t) * ARC_HEIGHT;
    drawLetter(g, Math.round(x), Math.round(y));
  }
}

function drawSelection(g: CanvasRenderingContext2D, box: { x: number; y: number }): void {
  const x = box.x, y = box.y + 2, w = DOLL_W, h = DOLL_H - 1;
  g.fillStyle = '#ffcf5a';
  const corners: Array<[number, number, number, number]> = [
    [x, y, 5, 2], [x, y, 2, 5], [x + w - 5, y, 5, 2], [x + w - 2, y, 2, 5],
    [x, y + h - 2, 5, 2], [x, y + h - 5, 2, 5], [x + w - 5, y + h - 2, 5, 2], [x + w - 2, y + h - 5, 2, 5]
  ];
  corners.forEach(([a, b, c, d]) => g.fillRect(a, b, c, d));
}
