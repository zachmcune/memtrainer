import { cardAtPosition, DECK_SIZE } from '../../data/mnemonica';
import { isDue, isNewOrLearning } from '../../db/schedule';
import type { CardStat, QueueStrategy, ScopeConfig, TrainingMode } from '../../db/types';

export interface Chunk {
  index: number;
  start: number;
  end: number;
  label: string;
}

/** Split the deck into chunks of `chunkSize` (last chunk may be smaller). */
export function computeChunks(chunkSize: number): Chunk[] {
  const size = Math.max(1, Math.min(DECK_SIZE, Math.floor(chunkSize) || 1));
  const chunks: Chunk[] = [];
  let index = 0;
  for (let start = 1; start <= DECK_SIZE; start += size) {
    const end = Math.min(start + size - 1, DECK_SIZE);
    chunks.push({ index, start, end, label: `${start}\u2013${end}` });
    index += 1;
  }
  return chunks;
}

/** Resolve a scope configuration into the concrete set of 1-based positions. */
export function resolveScopePositions(scope: ScopeConfig): number[] {
  if (scope.type === 'all') {
    return range(1, DECK_SIZE);
  }
  if (scope.type === 'range') {
    const lo = clamp(Math.min(scope.rangeStart, scope.rangeEnd), 1, DECK_SIZE);
    const hi = clamp(Math.max(scope.rangeStart, scope.rangeEnd), 1, DECK_SIZE);
    return range(lo, hi);
  }
  // chunks
  const chunks = computeChunks(scope.chunkSize);
  const selected = scope.selectedChunks.length
    ? scope.selectedChunks
    : [0];
  const positions = new Set<number>();
  for (const ci of selected) {
    const chunk = chunks[ci];
    if (chunk) {
      for (let p = chunk.start; p <= chunk.end; p += 1) positions.add(p);
    }
  }
  return [...positions].sort((a, b) => a - b);
}

export interface PositionWeight {
  position: number;
  weight: number;
}

/** Higher weight means the card is more likely to appear in dynamic mode. */
export function weaknessWeight(stat: CardStat | undefined): number {
  if (!stat || stat.attempts === 0) return 1;

  const accuracy = stat.correct / stat.attempts;
  const missRate = 1 - accuracy;
  const confidence = Math.min(1, stat.attempts / 4);

  // Weak cards get pulled more often; mastered cards still appear occasionally.
  return 0.12 + missRate * (0.88 * confidence + 0.35) + (1 - confidence) * 0.25;
}

/** Average accuracy for each 13-card section (positions 1–13, 14–26, …). */
export function chunkAccuracyBySection(
  positions: number[],
  stats: CardStat[],
  mode: TrainingMode,
  sectionSize = 13,
): Map<number, number> {
  const statByCode = new Map(stats.filter((s) => s.mode === mode).map((s) => [s.code, s]));
  const buckets = new Map<number, { attempts: number; correct: number }>();

  for (const position of positions) {
    const section = Math.floor((position - 1) / sectionSize);
    const stat = statByCode.get(cardAtPosition(position).code);
    const bucket = buckets.get(section) ?? { attempts: 0, correct: 0 };
    if (stat && stat.attempts > 0) {
      bucket.attempts += stat.attempts;
      bucket.correct += stat.correct;
    }
    buckets.set(section, bucket);
  }

  const out = new Map<number, number>();
  for (const [section, bucket] of buckets) {
    out.set(section, bucket.attempts ? bucket.correct / bucket.attempts : 0.65);
  }
  return out;
}

export function computePositionWeights(
  positions: number[],
  stats: CardStat[],
  mode: TrainingMode,
  sectionSize = 13,
): PositionWeight[] {
  const statByCode = new Map(stats.filter((s) => s.mode === mode).map((s) => [s.code, s]));
  const sectionAccuracy = chunkAccuracyBySection(positions, stats, mode, sectionSize);

  return positions.map((position) => {
    const code = cardAtPosition(position).code;
    const stat = statByCode.get(code);
    const section = Math.floor((position - 1) / sectionSize);
    const sectionAcc = sectionAccuracy.get(section) ?? 0.65;
    const spotBoost = 1 + (1 - sectionAcc) * 0.45;

    return {
      position,
      weight: weaknessWeight(stat) * spotBoost,
    };
  });
}

/**
 * Build the ordered queue of positions to prompt. Shuffles the in-scope
 * positions; if `sessionLength` requests more prompts than positions, it cycles
 * through freshly-shuffled copies so drills can be arbitrarily long.
 */
export function buildQueue(
  positions: number[],
  sessionLength: number | 'all',
): number[] {
  if (positions.length === 0) return [];
  const target =
    sessionLength === 'all'
      ? positions.length
      : Math.max(1, Math.floor(sessionLength));

  const queue: number[] = [];
  while (queue.length < target) {
    queue.push(...shuffle(positions));
  }
  return queue.slice(0, target);
}

/** Weighted queue that favors weak cards and weak stack sections. */
export function buildDynamicQueue(
  positions: number[],
  sessionLength: number | 'all',
  stats: CardStat[],
  mode: TrainingMode,
): number[] {
  if (positions.length === 0) return [];

  const target =
    sessionLength === 'all'
      ? positions.length
      : Math.max(1, Math.floor(sessionLength));

  const baseWeights = computePositionWeights(positions, stats, mode);
  const queue: number[] = [];

  while (queue.length < target) {
    const remaining = target - queue.length;
    const roundSize = sessionLength === 'all' ? remaining : Math.min(positions.length, remaining);
    queue.push(...weightedSampleWithoutReplacement(baseWeights, roundSize));
  }

  return queue.slice(0, target);
}

export interface DueCounts {
  /** In-scope cards that are due now (including never reviewed). */
  due: number;
  /** In-scope cards still in learning (interval 0), whether or not due. */
  learning: number;
  /** In-scope cards with a future due date. */
  scheduled: number;
}

/** Count due / learning / scheduled cards for the current mode + scope. */
export function countDueInScope(
  positions: number[],
  stats: CardStat[],
  mode: TrainingMode,
  now = Date.now(),
): DueCounts {
  const byCode = new Map(stats.filter((s) => s.mode === mode).map((s) => [s.code, s]));
  let due = 0;
  let learning = 0;
  let scheduled = 0;

  for (const position of positions) {
    const code = cardAtPosition(position).code;
    const stat = byCode.get(code);
    if (isDue(stat, now)) due += 1;
    if (isNewOrLearning(stat)) learning += 1;
    else if (stat && (stat.dueAt ?? 0) > now) scheduled += 1;
  }

  return { due, learning, scheduled };
}

/**
 * Spaced queue: overdue first (oldest dueAt), then top up with unseen/learning
 * only. Never pulls healthy future-due cards early.
 */
export function buildSpacedQueue(
  positions: number[],
  sessionLength: number | 'all',
  stats: CardStat[],
  mode: TrainingMode,
  now = Date.now(),
): number[] {
  if (positions.length === 0) return [];

  const byCode = new Map(stats.filter((s) => s.mode === mode).map((s) => [s.code, s]));

  const due: { position: number; dueAt: number }[] = [];
  for (const position of positions) {
    const code = cardAtPosition(position).code;
    const stat = byCode.get(code);
    if (isDue(stat, now)) {
      due.push({ position, dueAt: stat?.dueAt ?? 0 });
    }
  }

  // Oldest due first; shuffle equal dueAt buckets for variety.
  due.sort((a, b) => a.dueAt - b.dueAt || a.position - b.position);
  const dueOrdered: number[] = [];
  let i = 0;
  while (i < due.length) {
    const bucketAt = due[i].dueAt;
    const bucket: number[] = [];
    while (i < due.length && due[i].dueAt === bucketAt) {
      bucket.push(due[i].position);
      i += 1;
    }
    dueOrdered.push(...shuffle(bucket));
  }

  const target =
    sessionLength === 'all'
      ? dueOrdered.length
      : Math.max(1, Math.floor(sessionLength));

  // When nothing is due and length is 'all', return empty (nothing to review).
  if (sessionLength === 'all') {
    return dueOrdered;
  }

  const queue = dueOrdered.slice(0, target);
  if (queue.length >= target) return queue;

  // Top up only with never-seen / learning cards not already queued.
  const queued = new Set(queue);
  const fresh = positions.filter((p) => {
    if (queued.has(p)) return false;
    const code = cardAtPosition(p).code;
    const stat = byCode.get(code);
    return !stat || isNewOrLearning(stat);
  });
  const neverSeen = shuffle(fresh.filter((p) => !byCode.get(cardAtPosition(p).code)));
  const otherLearning = shuffle(fresh.filter((p) => byCode.get(cardAtPosition(p).code)));

  for (const p of [...neverSeen, ...otherLearning]) {
    if (queue.length >= target) break;
    if (queued.has(p)) continue;
    queue.push(p);
    queued.add(p);
  }

  return queue;
}

export function buildSessionQueue(
  positions: number[],
  sessionLength: number | 'all',
  strategy: QueueStrategy,
  stats: CardStat[],
  mode: TrainingMode,
  now = Date.now(),
): number[] {
  if (strategy === 'dynamic') {
    return buildDynamicQueue(positions, sessionLength, stats, mode);
  }
  if (strategy === 'spaced') {
    return buildSpacedQueue(positions, sessionLength, stats, mode, now);
  }
  return buildQueue(positions, sessionLength);
}

function weightedSampleWithoutReplacement(weights: PositionWeight[], count: number): number[] {
  const pool = weights.map((item) => ({ ...item }));
  const picked: number[] = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    let choice = pool[pool.length - 1];

    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) {
        choice = item;
        break;
      }
    }

    picked.push(choice.position);
    pool.splice(
      pool.findIndex((item) => item.position === choice.position),
      1,
    );
  }

  return picked;
}

export function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i += 1) out.push(i);
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
