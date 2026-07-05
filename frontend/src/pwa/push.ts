const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export interface ReminderPrefs {
  reminderTime: string; // "HH:mm"
  timezone: string;
  enabled: boolean;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** iOS only allows Web Push when launched from the Home Screen (standalone). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

export function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function notificationPermission(): NotificationPermission {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function api(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Request notification permission (must be called from a user gesture),
 * create/reuse a push subscription, and register it with the backend along
 * with the daily reminder preferences. Returns the subscription endpoint.
 */
export async function enableReminders(prefs: ReminderPrefs): Promise<string> {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this device.');
  if (isIos() && !isStandalone()) {
    throw new Error(
      'On iPhone/iPad, add this app to your Home Screen first, then open it from there to enable reminders.',
    );
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Server is missing its push configuration (VAPID key).');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const res = await api('/api/push/subscribe', { subscription: sub.toJSON(), ...prefs });
  if (!res.ok) throw new Error('Could not register reminders with the server.');
  return sub.endpoint;
}

export async function updateReminders(endpoint: string, prefs: ReminderPrefs): Promise<void> {
  const res = await api('/api/push/preferences', { endpoint, ...prefs });
  if (!res.ok) throw new Error('Could not update reminders.');
}

export async function disableReminders(endpoint: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // ignore
  }
  await api('/api/push/unsubscribe', { endpoint });
}

/** Fire a local test notification via the active service worker. */
export async function sendTestNotification(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Mnemonica Trainer', {
    body: 'Reminders are working. Time to run your stack!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
}
