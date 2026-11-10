/**
 * Node entry point: local development (`npm run dev`) and `npm start`.
 *
 * Production runs on Cloudflare Workers (src/worker/index.ts). Both entries
 * serve the same API from src/server/app.ts; this one adds firebase-admin,
 * the Vite dev middleware and the static build.
 */
import './src/server/env.js';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, firebaseAdmin } from './src/server/store.js';
import { configureApp, describeRuntime } from './src/server/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = configureApp({
  db,
  verifyIdToken: firebaseAdmin ? (token) => firebaseAdmin!.auth.verifyIdToken(token) : null,
  configError: firebaseAdmin
    ? undefined
    : 'firebase-admin could not be initialized. Check the [Firebase] lines in the server log.',
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AskMeAi] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[AskMeAi] ${describeRuntime()}`);
  });
}

startServer();
