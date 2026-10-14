// 명령줄에서 서버를 켠다 (npm start, wamad). 포트는 WAMAD_PORT 환경 변수로 바꿀 수 있다.
import { fileURLToPath } from 'node:url';
import { SERVER_PORT } from '../shared/protocol.ts';
import { startServer } from './app.ts';

const port = Number(process.env.WAMAD_PORT ?? process.env.AGENT_OFFICE_PORT ?? SERVER_PORT);
const url = await startServer({ port, webRoot: fileURLToPath(new URL('../dist/web/', import.meta.url)) });
console.log(`wamad (What Are My Agents Doing?): ${url} 에서 화면을 볼 수 있습니다.`);
