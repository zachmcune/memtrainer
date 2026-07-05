import assert from 'node:assert';
import { computeChunks, resolveScopePositions, buildQueue } from '../src/features/training/engine';
import { positionOf, cardAtPosition, DECK_SIZE } from '../src/data/mnemonica';
import { summarizeSession, computeStreak } from '../src/features/stats/compute';
import type { AttemptResult, ScopeConfig, SessionRecord } from '../src/db/types';

// Deck data
assert.equal(DECK_SIZE, 52);
assert.equal(positionOf('4C'), 1);
assert.equal(positionOf('9D'), 52);
assert.equal(cardAtPosition(7).code, 'AS');
assert.equal(cardAtPosition(52).code, '9D');

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

// Queue
assert.equal(buildQueue([1, 2, 3], 'all').length, 3);
assert.equal(buildQueue([1, 2, 3], 7).length, 7);
assert.equal(buildQueue([], 'all').length, 0);
const q = buildQueue([1, 2, 3, 4, 5], 5);
assert.deepEqual([...q].sort((a, b) => a - b), [1, 2, 3, 4, 5]);

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

console.log('All self-tests passed.');
