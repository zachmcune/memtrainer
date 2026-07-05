import { db } from './db';
import { DEFAULT_SETTINGS } from './defaults';
import type { AppSettings, AttemptResult, CardStat, SessionRecord } from './types';

/**
 * Abstraction over persistence so a future remote/synced implementation (once
 * accounts exist) can replace the local IndexedDB store without touching the UI.
 */
export interface StatsRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  saveSession(session: SessionRecord): Promise<number>;
  getSessions(): Promise<SessionRecord[]>;
  getCardStats(): Promise<CardStat[]>;
  clearAll(): Promise<void>;
}

function statId(mode: string, code: string): string {
  return `${mode}__${code}`;
}

class DexieStatsRepository implements StatsRepository {
  async getSettings(): Promise<AppSettings> {
    const existing = await db.settings.get('app');
    if (existing) {
      // Merge to pick up any newly-added default fields.
      return {
        ...DEFAULT_SETTINGS,
        ...existing,
        scope: { ...DEFAULT_SETTINGS.scope, ...existing.scope },
        stackScope: {
          ...DEFAULT_SETTINGS.stackScope,
          ...(existing.stackScope ?? DEFAULT_SETTINGS.stackScope),
        },
        queueStrategy: existing.queueStrategy ?? DEFAULT_SETTINGS.queueStrategy,
      };
    }
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'app' });
  }

  async saveSession(session: SessionRecord): Promise<number> {
    return db.transaction('rw', db.sessions, db.cardStats, async () => {
      const id = await db.sessions.add(session);
      await this.applyResults(session.results);
      return id as number;
    });
  }

  private async applyResults(results: AttemptResult[]): Promise<void> {
    for (const r of results) {
      const id = statId(r.mode, r.code);
      const prev = await db.cardStats.get(id);
      const next: CardStat = prev
        ? {
            ...prev,
            attempts: prev.attempts + 1,
            correct: prev.correct + (r.correct ? 1 : 0),
            totalTimeMs: prev.totalTimeMs + r.timeMs,
            lastSeen: r.timestamp,
          }
        : {
            id,
            mode: r.mode,
            code: r.code,
            position: r.position,
            attempts: 1,
            correct: r.correct ? 1 : 0,
            totalTimeMs: r.timeMs,
            lastSeen: r.timestamp,
          };
      await db.cardStats.put(next);
    }
  }

  async getSessions(): Promise<SessionRecord[]> {
    return db.sessions.orderBy('startedAt').reverse().toArray();
  }

  async getCardStats(): Promise<CardStat[]> {
    return db.cardStats.toArray();
  }

  async clearAll(): Promise<void> {
    await db.transaction('rw', db.sessions, db.cardStats, async () => {
      await db.sessions.clear();
      await db.cardStats.clear();
    });
  }
}

export const repository: StatsRepository = new DexieStatsRepository();
