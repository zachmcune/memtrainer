import 'dotenv/config';
import webpush from 'web-push';

export const PORT = Number(process.env.PORT ?? 8080);
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
export const FRONTEND_DIST = process.env.FRONTEND_DIST;

export const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[env] Web Push configured.');
} else {
  console.warn(
    '[env] VAPID keys missing; push reminders are disabled. Run `npm run generate-vapid`.',
  );
}
