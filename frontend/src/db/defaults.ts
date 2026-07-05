import type { AppSettings } from './types';

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  mode: 'card-to-position',
  scope: {
    type: 'all',
    chunkSize: 13,
    selectedChunks: [0],
    rangeStart: 1,
    rangeEnd: 52,
  },
  sessionLength: 'all',
  redrillMissed: true,
  reminderEnabled: false,
  reminderTime: '18:00',
  timezone: browserTimezone(),
};
