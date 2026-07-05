import { DECK_SIZE } from '../../data/mnemonica';
import type { ScopeConfig } from '../../db/types';

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
