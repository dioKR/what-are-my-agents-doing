#!/usr/bin/env node
// Claude Code 훅에서 실행된다. 받은 JSON을 로컬 서버로 넘긴다.
// - 보통은 아무것도 출력하지 않는다 (UserPromptSubmit 훅의 출력은 대화에 섞여 들어가기 때문)
// - PermissionRequest(권한 질문)만은 서버의 대답(앱에서 누른 허용 · 거부)을 기다렸다가 그대로 출력한다.
//   대답이 없으면 아무것도 출력하지 않아서, 평소처럼 터미널에서 묻는다
// - 서버가 꺼져 있거나 느려도 항상 0으로 끝나서 Claude Code를 막지 않는다
const PORT = process.env.WAMAD_PORT ?? process.env.AGENT_OFFICE_PORT ?? '4545';
const TIMEOUT_MS = 500;
/** 서버가 앱의 대답을 기다리는 시간(30초)보다 조금 길게 */
const PERMISSION_TIMEOUT_MS = 40_000;

let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { body += chunk; });
process.stdin.on('end', async () => {
  const isPermission = eventNameOf(body) === 'PermissionRequest';
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/${isPermission ? 'permission' : 'events'}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(isPermission ? PERMISSION_TIMEOUT_MS : TIMEOUT_MS)
    });
    if (isPermission) process.stdout.write(await res.text());
  } catch {
    // 서버가 안 떠 있으면 조용히 넘어간다
  }
  process.exit(0);
});

function eventNameOf(json) {
  try {
    return JSON.parse(json).hook_event_name;
  } catch {
    return null;
  }
}
