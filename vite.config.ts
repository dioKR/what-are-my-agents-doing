import { defineConfig } from 'vite';
import { SERVER_PORT } from './shared/protocol.ts';

export default defineConfig({
  root: 'web',
  build: { outDir: '../dist/web', emptyOutDir: true },
  server: {
    proxy: { '/api': `http://127.0.0.1:${SERVER_PORT}` }
  }
});
