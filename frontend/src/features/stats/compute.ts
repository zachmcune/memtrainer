import { computeChunks } from '../training/engine';
import type { AttemptResult, CardStat, SessionRecord, TrainingMode } from '../../db/types';

export interface SessionSummary {
  total: number;
  correct: number;
  accuracy: number; // 0..1
  avgTimeMs: number;
  fastestMs: number | null;
  slowestMs: number | null;
  /** Unique missed cards with the last wrong answer given. */
  missed: { code: string; position: number; userAnswer: string }[];
  perChunk: { label: string; total: number; correct: number; accuracy: number }[];
}

export function summarizeSession(
  results: AttemptResult[],
  chunkSize = 13,
): SessionSummary {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const times = results.map((r) => r.timeMs).filter((t) => t > 0);
  const avgTimeMs = times.length
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0;

  const missedMap = new Map<string, { code: string; position: number; userAnswer: string }>();
  for (const r of results) {
    if (!r.correct) {
      missedMap.set(r.code, { code: r.code, position: r.position, userAnswer: r.userAnswer });
    }
  }

  const chunks = computeChunks(chunkSize);
  const perChunk = chunks
    .map((c) => {
      const inChunk = results.filter((r) => r.position >= c.start && r.position <= c.end);
      const cCorrect = inChunk.filter((r) => r.correct).length;
      return {
        label: c.label,
        total: inChunk.length,
        correct: cCorrect,
        accuracy: inChunk.length ? cCorrect / inChunk.length : 0,
      };
    })
    .filter((c) => c.total > 0);

  return {
    total,
    correct,
    accuracy: total ? correct / total : 0,
    avgTimeMs,
    fastestMs: times.length ? Math.min(...times) : null,
    slowestMs: times.length ? Math.max(...times) : null,
    missed: [...missedMap.values()].sort((a, b) => a.position - b.position),
    perChunk,
  };
}

export interface HistorySummary {
  totalSessions: number;
  totalAttempts: number;
  overallAccuracy: number;
  streakDays: number;
  /** Worst-performing cards across history (lowest accuracy, min attempts). */
  weakest: {
    code: string;
    position: number;
    mode: TrainingMode;
    attempts: number;
    correct: number;
    accuracy: number;
    avgTimeMs: number;
  }[];
  /** Accuracy per session, oldest -> newest, for the trend chart. */
  trend: { accuracy: number; date: number }[];
}

export interface RankedCard {
  code: string;
  position: number;
  mode: TrainingMode;
  attempts: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
}

export function rankCardStats(cardStats: CardStat[], mode: TrainingMode): RankedCard[] {
  return cardStats
    .filter((s) => s.mode === mode && s.attempts > 0)
    .map((s) => ({
      code: s.code,
      position: s.position,
      mode: s.mode,
      attempts: s.attempts,
      correct: s.correct,
      accuracy: s.correct / s.attempts,
      avgTimeMs: s.totalTimeMs / s.attempts,
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts || a.position - b.position);
}

export function summarizeHistory(
  sessions: SessionRecord[],
  cardStats: CardStat[],
): HistorySummary {
  const totalSessions = sessions.length;
  const totalAttempts = cardStats.reduce((a, s) => a + s.attempts, 0);
  const totalCorrect = cardStats.reduce((a, s) => a + s.correct, 0);

  const weakest = cardStats
    .filter((s) => s.attempts > 0)
    .map((s) => ({
      code: s.code,
      position: s.position,
      mode: s.mode,
      attempts: s.attempts,
      correct: s.correct,
      accuracy: s.correct / s.attempts,
      avgTimeMs: s.totalTimeMs / s.attempts,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 10);

  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const trend = ordered.map((s) => ({
    accuracy: s.total ? s.correct / s.total : 0,
    date: s.startedAt,
  }));

  return {
    totalSessions,
    totalAttempts,
    overallAccuracy: totalAttempts ? totalCorrect / totalAttempts : 0,
    streakDays: computeStreak(sessions),
    weakest,
    trend,
  };
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive-day practice streak counting back from today (or yesterday). */
export function computeStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)));
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to be "alive" if practiced today or yesterday.
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.getTime()))) return 0;
  }
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatMs(ms: number | null): string {
  if (ms == null) return '\u2014';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function accuracyColor(acc: number): string {
  if (acc >= 0.85) return 'var(--good)';
  if (acc >= 0.6) return 'var(--warn)';
  return 'var(--bad)';
}
