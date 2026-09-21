import assert from 'node:assert';
import {
  buildDynamicQueue,
  buildQueue,
  buildSpacedQueue,
  computeChunks,
  computePositionWeights,
  countDueInScope,
  resolveScopePositions,
  weaknessWeight,
} from '../src/features/training/engine';
import {
  applyReviewSchedule,
  DEFAULT_EASE,
  MS_PER_DAY,
  withScheduleDefaults,
} from '../src/db/schedule';
import { positionOf, cardAtPosition, DECK_SIZE, stackGroupPositions } from '../src/data/mnemonica';
import { takeRandomCard } from '../src/features/deal/draw';
import { rankCardStats, summarizeSession, computeStreak } from '../src/features/stats/compute';
import { isRemoteNewer, isSameBuild } from '../src/version';
import { normalizeScopeConfig, remapChunkSelection } from '../src/data/scopeNormalize';
import type { AttemptResult, CardStat, ScopeConfig, SessionRecord } from '../src/db/types';

// Deck data
assert.equal(DECK_SIZE, 52);
assert.equal(positionOf('4C'), 1);
assert.equal(positionOf('9D'), 52);
assert.equal(cardAtPosition(7).code, 'AS');
assert.equal(cardAtPosition(52).code, '9D');

// Fixed stack groups of four (1–4, 5–8, …, 49–52)
assert.deepEqual(stackGroupPositions(1), [1, 2, 3, 4]);
assert.deepEqual(stackGroupPositions(2), [1, 2, 3, 4]);
assert.deepEqual(stackGroupPositions(4), [1, 2, 3, 4]);
assert.deepEqual(stackGroupPositions(5), [5, 6, 7, 8]);
assert.deepEqual(stackGroupPositions(7), [5, 6, 7, 8]);
assert.deepEqual(stackGroupPositions(13), [13, 14, 15, 16]);
assert.deepEqual(stackGroupPositions(52), [49, 50, 51, 52]);

// Random deal: no replacement, no immediate repeat, empty packet reshuffles.
{
  const first = takeRandomCard([4, 9, 12], null);
  assert.equal(first.position, 4);
  assert.deepEqual(first.rest, [9, 12]);
  assert.equal(first.reshuffled, false);

  const skipped = takeRandomCard([4, 9, 12], 4);
  assert.equal(skipped.position, 9);
  assert.deepEqual(skipped.rest, [4, 12]);

  const only = takeRandomCard([7], 7);
  assert.equal(only.position, 7);
  assert.deepEqual(only.rest, []);
  assert.equal(only.reshuffled, false);

  const source = [1, 2, 3];
  takeRandomCard(source, null);
  assert.deepEqual(source, [1, 2, 3]);

  let packet: number[] = [];
  const seen = new Set<number>();
  let avoid: number | null = null;
  for (let i = 0; i < DECK_SIZE; i += 1) {
    const draw = takeRandomCard(packet, avoid);
    assert.equal(draw.reshuffled, i === 0);
    assert.ok(draw.position >= 1 && draw.position <= DECK_SIZE);
    assert.ok(!seen.has(draw.position));
    assert.notEqual(draw.position, avoid);
    seen.add(draw.position);
    avoid = draw.position;
    packet = draw.rest;
  }
  assert.equal(seen.size, DECK_SIZE);
  assert.equal(packet.length, 0);
}

// Repeats leave the packet untouched and can draw any stack position.
{
  const packet = [4, 9, 12];
  const draw = takeRandomCard(packet, 4, { repeat: true });
  assert.equal(draw.reshuffled, false);
  assert.deepEqual(draw.rest, [4, 9, 12]);
  assert.deepEqual(packet, [4, 9, 12]);
  assert.ok(draw.position >= 1 && draw.position <= DECK_SIZE);

  const seen = new Set<number>();
  for (let i = 0; i < 80; i += 1) {
    seen.add(takeRandomCard(packet, null, { repeat: true }).position);
  }
  assert.ok(seen.size > 1);
}

// Chunks
const chunks = computeChunks(13);
assert.equal(chunks.length, 4);
assert.equal(chunks[0].label, '1\u201313');
assert.equal(chunks[3].label, '40\u201352');

// Scope resolution
const base: ScopeConfig = { type: 'all', chunkSize: 13, selectedChunks: [0], rangeStart: 1, rangeEnd: 52 };
assert.equal(resolveScopePositions(base).length, 52);
assert.deepEqual(
  resolveScopePositions({ ...base, type: 'chunks', selectedChunks: [0, 3] }).length,
  26,
);
assert.deepEqual(resolveScopePositions({ ...base, type: 'range', rangeStart: 10, rangeEnd: 20 }).length, 11);
// reversed range is normalized
assert.deepEqual(resolveScopePositions({ ...base, type: 'range', rangeStart: 20, rangeEnd: 10 }).length, 11);

// Stale chunk indices after section resize resolve to overlapping cards, not zero.
const tailScope: ScopeConfig = {
  ...base,
  type: 'chunks',
  chunkSize: 13,
  selectedChunks: [2, 3],
};
assert.equal(resolveScopePositions(tailScope).length, 26);
assert.equal(
  resolveScopePositions(normalizeScopeConfig({ ...tailScope, chunkSize: 26 })).length,
  26,
);
assert.deepEqual(remapChunkSelection(tailScope, 26).sort(), [1]);
assert.equal(
  resolveScopePositions({
    ...tailScope,
    chunkSize: 26,
    selectedChunks: remapChunkSelection(tailScope, 26),
  }).length,
  26,
);
// Invalid-only indices recover overlapping sections instead of an empty scope.
assert.equal(
  resolveScopePositions({ ...base, type: 'chunks', chunkSize: 26, selectedChunks: [9, 10] }).length,
  26,
);

// Queue
assert.equal(buildQueue([1, 2, 3], 'all').length, 3);
assert.equal(buildQueue([1, 2, 3], 7).length, 7);
assert.equal(buildQueue([], 'all').length, 0);
const q = buildQueue([1, 2, 3, 4, 5], 5);
assert.deepEqual([...q].sort((a, b) => a - b), [1, 2, 3, 4, 5]);

// Dynamic queue weights weak cards higher
const weakStat: CardStat = withScheduleDefaults({
  id: 'card-to-position__2H',
  mode: 'card-to-position',
  code: '2H',
  position: 2,
  attempts: 10,
  correct: 2,
  totalTimeMs: 10000,
  lastSeen: 1,
});
const strongStat: CardStat = withScheduleDefaults({
  id: 'card-to-position__4C',
  mode: 'card-to-position',
  code: '4C',
  position: 1,
  attempts: 10,
  correct: 9,
  totalTimeMs: 5000,
  lastSeen: 1,
});
assert.ok(weaknessWeight(weakStat) > weaknessWeight(strongStat));

const weights = computePositionWeights([1, 2], [weakStat, strongStat], 'card-to-position');
const weakWeight = weights.find((w) => w.position === 2)!.weight;
const strongWeight = weights.find((w) => w.position === 1)!.weight;
assert.ok(weakWeight > strongWeight);

const dynamic = buildDynamicQueue([1, 2], 'all', [weakStat, strongStat], 'card-to-position');
assert.equal(dynamic.length, 2);
assert.deepEqual([...dynamic].sort((a, b) => a - b), [1, 2]);

const ranked = rankCardStats([weakStat, strongStat], 'card-to-position');
assert.equal(ranked[0].code, '4C');
assert.equal(ranked[1].code, '2H');

// Spaced review schedule
const t0 = 1_700_000_000_000;
const firstCorrect = applyReviewSchedule(undefined, true, t0);
assert.equal(firstCorrect.intervalDays, 1);
assert.equal(firstCorrect.dueAt, t0 + MS_PER_DAY);
assert.equal(firstCorrect.ease, DEFAULT_EASE);

const secondCorrect = applyReviewSchedule(firstCorrect, true, t0 + MS_PER_DAY);
assert.equal(secondCorrect.intervalDays, Math.round(1 * DEFAULT_EASE));
assert.ok(secondCorrect.ease > firstCorrect.ease);
assert.equal(secondCorrect.dueAt, t0 + MS_PER_DAY + secondCorrect.intervalDays * MS_PER_DAY);

const afterMiss = applyReviewSchedule(secondCorrect, false, t0 + 2 * MS_PER_DAY);
assert.equal(afterMiss.intervalDays, 0);
assert.equal(afterMiss.dueAt, t0 + 2 * MS_PER_DAY);
assert.ok(afterMiss.ease < secondCorrect.ease);
assert.equal(afterMiss.lapses, 1);

// Spaced queue: only due cards; never pull future-due early
const nowTs = t0 + 3 * MS_PER_DAY;
const dueStat = withScheduleDefaults({
  id: 'card-to-position__2H',
  mode: 'card-to-position',
  code: '2H',
  position: 2,
  attempts: 2,
  correct: 1,
  totalTimeMs: 1000,
  lastSeen: nowTs,
  dueAt: nowTs - 1000,
  intervalDays: 1,
  ease: DEFAULT_EASE,
  reps: 1,
  lapses: 0,
});
const futureStat = withScheduleDefaults({
  id: 'card-to-position__4C',
  mode: 'card-to-position',
  code: '4C',
  position: 1,
  attempts: 3,
  correct: 3,
  totalTimeMs: 1000,
  lastSeen: nowTs,
  dueAt: nowTs + 5 * MS_PER_DAY,
  intervalDays: 5,
  ease: DEFAULT_EASE,
  reps: 3,
  lapses: 0,
});
const spaced = buildSpacedQueue([1, 2, 3], 'all', [dueStat, futureStat], 'card-to-position', nowTs);
assert.equal(spaced.length, 2);
assert.ok(spaced.includes(2));
assert.ok(spaced.includes(3));
assert.ok(!spaced.includes(1));
// New cards (dueAt 0) sort before overdue cards with later dueAt
assert.equal(spaced[0], 3);

const spacedCounts = countDueInScope([1, 2, 3], [dueStat, futureStat], 'card-to-position', nowTs);
assert.equal(spacedCounts.due, 2); // 2 due + 3 new
assert.equal(spacedCounts.scheduled, 1);

const spacedLen = buildSpacedQueue([1, 2, 3], 10, [dueStat, futureStat], 'card-to-position', nowTs);
assert.ok(spacedLen.length >= 2);
assert.ok(!spacedLen.includes(1));

// Session summary
const results: AttemptResult[] = [
  { code: '4C', position: 1, mode: 'card-to-position', userAnswer: '1', correct: true, timeMs: 1000, timestamp: 1 },
  { code: '2H', position: 2, mode: 'card-to-position', userAnswer: '3', correct: false, timeMs: 3000, timestamp: 2 },
  { code: 'AS', position: 7, mode: 'card-to-position', userAnswer: '7', correct: true, timeMs: 2000, timestamp: 3 },
];
const s = summarizeSession(results);
assert.equal(s.total, 3);
assert.equal(s.correct, 2);
assert.ok(Math.abs(s.accuracy - 2 / 3) < 1e-9);
assert.equal(s.fastestMs, 1000);
assert.equal(s.slowestMs, 3000);
assert.equal(s.avgTimeMs, 2000);
assert.equal(s.missed.length, 1);
assert.equal(s.missed[0].code, '2H');

// Streak
const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const sessions: SessionRecord[] = [
  { startedAt: now, finishedAt: now, mode: 'card-to-position', scopePositions: [], results: [], total: 1, correct: 1 },
  { startedAt: now - day, finishedAt: now - day, mode: 'card-to-position', scopePositions: [], results: [], total: 1, correct: 1 },
];
assert.equal(computeStreak(sessions), 2);
assert.equal(computeStreak([]), 0);

// Version helpers
const v100a = { version: '1.0.0', build: 'abc1234', builtAt: '2026-01-01T00:00:00.000Z' };
const v100b = { version: '1.0.0', build: 'def5678', builtAt: '2026-01-02T00:00:00.000Z' };
const v110 = { version: '1.1.0', build: 'abc1234', builtAt: '2026-01-03T00:00:00.000Z' };
assert.equal(isSameBuild(v100a, v100a), true);
assert.equal(isSameBuild(v100a, v100b), false);
assert.equal(isRemoteNewer(v100a, v110), true);
assert.equal(isRemoteNewer(v100a, v100b), true);
assert.equal(isRemoteNewer(v110, v100a), false);

console.log('All self-tests passed.');
