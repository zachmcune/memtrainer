import type { CardStat } from './types';

export const DEFAULT_EASE = 2.3;
export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Defaults for spaced-review fields when migrating older CardStat rows. */
export function withScheduleDefaults(
  partial: Partial<CardStat> &
    Pick<CardStat, 'id' | 'mode' | 'code' | 'position' | 'attempts' | 'correct' | 'totalTimeMs' | 'lastSeen'>,
): CardStat {
  return {
    dueAt: 0,
    intervalDays: 0,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
    ...partial,
  };
}

export function isDue(stat: CardStat | undefined, now: number): boolean {
  if (!stat) return true;
  return (stat.dueAt ?? 0) <= now;
}

export function isNewOrLearning(stat: CardStat | undefined): boolean {
  if (!stat) return true;
  return (stat.intervalDays ?? 0) === 0;
}

/**
 * Apply one review outcome to spaced-review fields.
 * Correct + interval 0 → 1 day. Correct + interval → grow by ease.
 * Miss → reset interval, due immediately, ease down.
 */
export function applyReviewSchedule(
  prev: Pick<CardStat, 'intervalDays' | 'ease' | 'reps' | 'lapses'> | undefined,
  correct: boolean,
  now: number,
): Pick<CardStat, 'dueAt' | 'intervalDays' | 'ease' | 'reps' | 'lapses'> {
  const intervalDays = prev?.intervalDays ?? 0;
  const ease = prev?.ease ?? DEFAULT_EASE;
  const reps = prev?.reps ?? 0;
  const lapses = prev?.lapses ?? 0;

  if (!correct) {
    return {
      dueAt: now,
      intervalDays: 0,
      ease: Math.max(MIN_EASE, ease - 0.2),
      reps: 0,
      lapses: lapses + (intervalDays > 0 || reps > 0 ? 1 : 0),
    };
  }

  if (intervalDays === 0) {
    return {
      dueAt: now + MS_PER_DAY,
      intervalDays: 1,
      ease,
      reps: reps + 1,
      lapses,
    };
  }

  const nextInterval = Math.max(1, Math.round(intervalDays * ease));
  const nextEase = Math.min(MAX_EASE, ease + 0.05);
  return {
    dueAt: now + nextInterval * MS_PER_DAY,
    intervalDays: nextInterval,
    ease: nextEase,
    reps: reps + 1,
    lapses,
  };
}
