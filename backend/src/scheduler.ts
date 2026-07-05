import cron from 'node-cron';
import webpush from 'web-push';
import { prisma } from './prisma.js';
import { pushConfigured } from './env.js';

/** Minutes of "grace" after the scheduled time in which a missed reminder still fires. */
const LATE_WINDOW_MIN = 15;

interface LocalParts {
  minutes: number; // minutes since local midnight
  day: string; // YYYY-MM-DD in the subscription's timezone
}

function localParts(timezone: string): LocalParts {
  let tz = timezone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
  } catch {
    tz = 'UTC';
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0; // some environments emit "24" for midnight
  const minute = Number(get('minute'));
  return {
    minutes: hour * 60 + minute,
    day: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function targetMinutes(reminderTime: string): number {
  const [h, m] = reminderTime.split(':').map(Number);
  return h * 60 + m;
}

async function sendReminder(sub: {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<boolean> {
  const payload = JSON.stringify({
    title: 'Mnemonica Trainer',
    body: 'Time for your daily stack drill. Keep the streak alive!',
    url: '/train',
  });
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return true;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription expired/unsubscribed on the client; clean it up.
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      console.log(`[scheduler] Removed stale subscription ${sub.id}`);
    } else {
      console.error(`[scheduler] Failed to send to ${sub.id}:`, statusCode ?? err);
    }
    return false;
  }
}

async function tick(): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { enabled: true } });
  for (const sub of subs) {
    const { minutes, day } = localParts(sub.timezone);
    const target = targetMinutes(sub.reminderTime);
    const due = minutes >= target && minutes - target <= LATE_WINDOW_MIN;
    if (!due || sub.lastSentDay === day) continue;

    const ok = await sendReminder(sub);
    if (ok) {
      await prisma.pushSubscription
        .update({ where: { id: sub.id }, data: { lastSentDay: day } })
        .catch(() => undefined);
    }
  }
}

export function startScheduler(): void {
  if (!pushConfigured) {
    console.warn('[scheduler] Not started (push not configured).');
    return;
  }
  cron.schedule('* * * * *', () => {
    tick().catch((e) => console.error('[scheduler] tick error', e));
  });
  console.log('[scheduler] Daily reminder scheduler started (checks every minute).');
}
