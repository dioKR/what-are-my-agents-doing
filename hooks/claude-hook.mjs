#!/usr/bin/env node
// Claude Code 훅에서 실행된다. 받은 JSON을 로컬 서버로 넘기기만 한다.
// - 아무것도 출력하지 않는다 (UserPromptSubmit 훅의 출력은 대화에 섞여 들어가기 때문)
// - 서버가 꺼져 있거나 느려도 항상 0으로 끝나서 Claude Code를 막지 않는다
const PORT = process.env.WAMAD_PORT ?? process.env.AGENT_OFFICE_PORT ?? '4545';
const TIMEOUT_MS = 500;

let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { body += chunk; });
process.stdin.on('end', async () => {
  try {
    await fetch(`http://127.0.0.1:${PORT}/api/events/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch {
    // 서버가 안 떠 있으면 조용히 넘어간다
  }
  process.exit(0);
});
