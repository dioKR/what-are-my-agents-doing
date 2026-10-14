// 지도 위에 얹는 글자들(이름표, 방 이름, 하위 에이전트 표시). 픽셀 글꼴 대신 HTML로 그려 한글이 또렷하게 보이게 한다.
import type { AgentSnapshot } from '../../../shared/protocol.ts';
import type { Actor, ActorDirector } from './actors.ts';
import { ROOMS, TILE } from './map.ts';
import { actorBox } from './renderer.ts';
import { DOLL_FOOT_Y, DOLL_W } from './character/doll.ts';
import { lt, t } from '../i18n.ts';
import { recipientLabel } from './team.ts';

const BUBBLE_SIDE_GAP = -2;
const BUBBLE_FACE_Y = 19; // 얼굴 높이쯤
const NAME_Y = DOLL_FOOT_Y + 3; // 발 바로 아래
/** 말풍선은 손이 바쁠 때만 띄운다. 기다리거나 자는 중이면 카드와 상세 칸으로 충분하다. */
const BUSY: ReadonlySet<AgentSnapshot['activity']> = new Set(['working', 'thinking', 'researching', 'background', 'mail-send', 'mail-read', 'stuck']);

function bubbleText(agent: AgentSnapshot | undefined, actor: Actor, selected: boolean): string | null {
  if (!agent || actor.removed || !BUSY.has(agent.activity)) return null;
  // 회의실은 붐벼서, 팀원의 평소 작업 말풍선은 고른 팀원만 띄운다 (메시지·지시 말풍선은 따로 뜬다)
  if (actor.teamRole && actor.place === 'meeting' && !selected) return null;
  return lt(agent.summary) || null;
}

export class MapLabels {
  private readonly tags = new Map<string, HTMLSpanElement>();
  private readonly layer: HTMLElement;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    ROOMS.forEach((_room, i) => this.tag(`room-${i}`, 'room-name'));
  }

  /** origin: 화면 왼쪽 위가 지도의 어디인지 (지도 픽셀) */
  update(director: ActorDirector, agents: ReadonlyMap<string, AgentSnapshot>, nameOf: (id: string) => string, scale: number, origin: { x: number; y: number }, selectedId: string | null): void {
    const seen = new Set<string>();
    const show = (key: string, cls: string, text: string, x: number, y: number) => {
      const el = this.tag(key, cls);
      // 같은 말풍선이 평소 말 → 팀 메시지로 바뀌거나 좌우가 바뀔 수 있어 모양도 매번 맞춘다
      if (el.className !== cls) el.className = cls;
      if (el.textContent !== text) el.textContent = text;
      el.style.left = `${(x - origin.x) * scale}px`;
      el.style.top = `${(y - origin.y) * scale}px`;
      el.hidden = false;
      seen.add(key);
      return el;
    };
    const visibleRight = origin.x + this.layer.clientWidth / scale;
    ROOMS.forEach((room, i) => show(`room-${i}`, 'room-name', lt(room.name), room.x * TILE, room.y * TILE));
    for (const actor of director.actors.values()) {
      const box = actorBox(actor);
      show(`name-${actor.id}`, 'tag', nameOf(actor.id), box.x + DOLL_W / 2, box.y + NAME_Y);
      // 말풍선은 머리 오른쪽 옆에 띄운다. 위에 띄우면 윗줄 자리의 이름표와 겹친다.
      const say = director.activeSay(actor);
      const sayText = say && (say.kind === 'ceo' ? t('team.ceoSays', { text: say.text }) : t('team.toSays', { to: recipientLabel(say.to ?? ''), text: say.text }));
      const bubble = sayText || bubbleText(agents.get(actor.id), actor, actor.id === selectedId);
      if (bubble) {
        const kind = `bubble${say ? ' say' : ''}${say?.kind === 'ceo' ? ' ceo' : ''}`;
        const rightX = box.x + DOLL_W + BUBBLE_SIDE_GAP;
        const el = show(`bubble-${actor.id}`, kind, bubble, rightX, box.y + BUBBLE_FACE_Y);
        // 오른쪽에 띄우면 화면 밖으로 잘리는 말풍선만 머리 왼쪽으로 옮긴다
        const overflowsRight = rightX + el.offsetWidth / scale > visibleRight;
        if (overflowsRight) show(`bubble-${actor.id}`, `${kind} flip`, bubble, box.x - BUBBLE_SIDE_GAP, box.y + BUBBLE_FACE_Y);
      }
      const subs = agents.get(actor.id)?.subagents.length ?? 0;
      const firstIntern = actor.internSpot(0);
      if (subs > 0 && !actor.removed) show(`sub-${actor.id}`, 'tag sub', t('map.sub', { n: subs }), (firstIntern.x + 0.2) * TILE, firstIntern.y * TILE + 1);
    }
    if (director.courier.isVisible) show('courier', 'tag', t('map.courier'), director.courier.x * TILE + TILE / 2, director.courier.y * TILE + TILE);
    for (const [key, el] of this.tags) if (!seen.has(key)) el.hidden = true;
  }

  private tag(key: string, cls: string): HTMLSpanElement {
    let el = this.tags.get(key);
    if (!el) {
      el = document.createElement('span');
      el.className = cls;
      this.layer.appendChild(el);
      this.tags.set(key, el);
    }
    return el;
  }
}
