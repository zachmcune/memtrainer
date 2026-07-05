import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { PORT, FRONTEND_DIST } from './env.js';
import { pushRouter } from './routes/push.js';
import { startScheduler } from './scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveFrontendDist(): string | null {
  const candidates = [
    FRONTEND_DIST,
    resolve(__dirname, '..', '..', 'frontend', 'dist'),
    resolve(process.cwd(), 'frontend', 'dist'),
    resolve(process.cwd(), '..', 'frontend', 'dist'),
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(join(p, 'index.html'))) ?? null;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/push', pushRouter);

// Anything else under /api is unknown.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

const distDir = resolveFrontendDist();
if (distDir) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
  console.log(`[server] Serving frontend from ${distDir}`);
} else {
  console.warn('[server] Frontend build not found; serving API only.');
  app.get('/', (_req, res) => res.send('Mnemonica Trainer API is running.'));
}

app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  startScheduler();
});
