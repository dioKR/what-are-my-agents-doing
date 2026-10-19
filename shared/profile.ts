import type { AgentSnapshot } from './protocol.ts';

/**
 * 이름·꾸미기·상점 착용·기록을 기억하는 기준: 같은 도구 + 같은 프로젝트 폴더면 같은 에이전트로 본다. 팀원은 팀원 이름까지 본다.
 * 작업 중 하위 폴더로 cd 해도 바뀌지 않도록 그 순간의 작업 폴더(cwd)가 아니라 프로젝트 폴더를 쓴다.
 */
export const profileKey = (agent: AgentSnapshot) => `${agent.tool}:${agent.projectDir ?? agent.cwd}${agent.parentId ? `:${agent.memberName ?? agent.role}` : ''}`;
