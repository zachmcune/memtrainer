import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma.js';
import { VAPID_PUBLIC_KEY, pushConfigured } from '../env.js';

export const pushRouter = Router();

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function sanitizeTime(value: unknown): string {
  return typeof value === 'string' && TIME_RE.test(value) ? value : '18:00';
}

function sanitizeTz(value: unknown): string {
  return typeof value === 'string' && value.length > 0 && value.length < 64 ? value : 'UTC';
}

pushRouter.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY, enabled: pushConfigured });
});

pushRouter.post('/subscribe', async (req: Request, res: Response) => {
  const { subscription, reminderTime, timezone, enabled } = req.body ?? {};
  const endpoint: unknown = subscription?.endpoint;
  const p256dh: unknown = subscription?.keys?.p256dh;
  const auth: unknown = subscription?.keys?.auth;

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return res.status(400).json({ error: 'Invalid subscription payload.' });
  }

  const data = {
    p256dh,
    auth,
    reminderTime: sanitizeTime(reminderTime),
    timezone: sanitizeTz(timezone),
    enabled: enabled !== false,
    lastSentDay: null,
  };

  const saved = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, ...data },
    update: data,
  });

  res.json({ ok: true, id: saved.id });
});

pushRouter.post('/preferences', async (req: Request, res: Response) => {
  const { endpoint, reminderTime, timezone, enabled } = req.body ?? {};
  if (typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Missing endpoint.' });
  }

  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!existing) return res.status(404).json({ error: 'Subscription not found.' });

  await prisma.pushSubscription.update({
    where: { endpoint },
    data: {
      reminderTime: reminderTime !== undefined ? sanitizeTime(reminderTime) : existing.reminderTime,
      timezone: timezone !== undefined ? sanitizeTz(timezone) : existing.timezone,
      enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled,
      // Reset so a changed time can fire again today if appropriate.
      lastSentDay: null,
    },
  });

  res.json({ ok: true });
});

pushRouter.post('/unsubscribe', async (req: Request, res: Response) => {
  const { endpoint } = req.body ?? {};
  if (typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Missing endpoint.' });
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  res.json({ ok: true });
});
