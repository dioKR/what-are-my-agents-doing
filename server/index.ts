// 명령줄에서 서버를 켠다 (npm start, wamad). 포트는 WAMAD_PORT 환경 변수로 바꿀 수 있다.
// 저장소에서는 server/index.ts 그대로, npm으로 설치하면 묶은 dist/server/index.mjs로 실행된다.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SERVER_PORT } from '../shared/protocol.ts';
import { startServer } from './app.ts';

/** 화면 파일 폴더: 저장소(server/ 옆의 dist/web) 또는 묶은 파일(dist/server/ 옆의 web) */
const WEB_ROOT_CANDIDATES = ['../dist/web/', '../web/'].map((p) => fileURLToPath(new URL(p, import.meta.url)));
const webRoot = WEB_ROOT_CANDIDATES.find((dir) => existsSync(`${dir}index.html`)) ?? WEB_ROOT_CANDIDATES[0];

const port = Number(process.env.WAMAD_PORT ?? process.env.AGENT_OFFICE_PORT ?? SERVER_PORT);
const { url } = await startServer({ port, webRoot });
console.log(`wamad (What Are My Agents Doing?): ${url} 에서 화면을 볼 수 있습니다.`);
