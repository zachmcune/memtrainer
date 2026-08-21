import { computeChunks } from './scopeChunks';
import type { ScopeConfig } from '../db/types';
import { DECK_SIZE } from './mnemonica';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Positions covered by the selected chunks for a chunks-type scope. */
export function selectedChunkPositions(scope: ScopeConfig): Set<number> {
  const positions = new Set<number>();
  if (scope.type !== 'chunks') return positions;

  const chunks = computeChunks(scope.chunkSize);
  for (const ci of scope.selectedChunks) {
    const chunk = chunks[ci];
    if (!chunk) continue;
    for (let p = chunk.start; p <= chunk.end; p += 1) positions.add(p);
  }
  return positions;
}

/**
 * Drop stale chunk indices and clamp range inputs so a saved scope cannot
 * resolve to zero cards after the section size changes.
 */
export function normalizeScopeConfig(scope: ScopeConfig): ScopeConfig {
  if (scope.type === 'range') {
    return {
      ...scope,
      rangeStart: clamp(Math.floor(scope.rangeStart) || 1, 1, DECK_SIZE),
      rangeEnd: clamp(Math.floor(scope.rangeEnd) || DECK_SIZE, 1, DECK_SIZE),
    };
  }

  if (scope.type !== 'chunks') return scope;

  const chunkSize = clamp(Math.floor(scope.chunkSize) || 1, 1, DECK_SIZE);
  const chunks = computeChunks(chunkSize);
  const maxIndex = Math.max(0, chunks.length - 1);
  let selected = [...new Set(scope.selectedChunks)]
    .filter((i) => Number.isInteger(i) && i >= 0 && i <= maxIndex)
    .sort((a, b) => a - b);

  if (selected.length === 0 && scope.selectedChunks.length > 0) {
    selected = recoverStaleChunkSelection({ ...scope, chunkSize });
  }

  return {
    ...scope,
    chunkSize,
    selectedChunks: selected.length > 0 ? selected : [0],
  };
}

/** Section sizes exposed in the UI — used to recover stale saved chunk indices. */
const KNOWN_CHUNK_SIZES = [4, 5, 7, 10, 13, 17, 26];

function recoverStaleChunkSelection(scope: ScopeConfig): number[] {
  const maxSelected = Math.max(...scope.selectedChunks);
  const newChunks = computeChunks(scope.chunkSize);
  if (maxSelected <= newChunks.length - 1) {
    return scope.selectedChunks.filter((i) => i >= 0 && i <= newChunks.length - 1);
  }

  for (const oldSize of KNOWN_CHUNK_SIZES) {
    const oldChunks = computeChunks(oldSize);
    if (maxSelected >= oldChunks.length) continue;
    const remapped = remapChunkSelection({ ...scope, chunkSize: oldSize }, scope.chunkSize);
    if (remapped.length > 0) return remapped;
  }

  return [0];
}

/**
 * When the section size changes, map the previous selection onto the new
 * chunk layout so a large multi-section scope stays valid.
 */
export function remapChunkSelection(oldScope: ScopeConfig, newChunkSize: number): number[] {
  const size = clamp(Math.floor(newChunkSize) || 1, 1, DECK_SIZE);
  const oldChunks = computeChunks(oldScope.chunkSize);
  const newChunks = computeChunks(size);

  if (oldScope.selectedChunks.length === 0) return [0];
  if (oldScope.selectedChunks.length >= oldChunks.length) {
    return newChunks.map((c) => c.index);
  }

  const positions = selectedChunkPositions(oldScope);
  if (positions.size === 0) return [0];

  const selected = new Set<number>();
  for (const chunk of newChunks) {
    for (let p = chunk.start; p <= chunk.end; p += 1) {
      if (positions.has(p)) {
        selected.add(chunk.index);
        break;
      }
    }
  }

  return selected.size > 0 ? [...selected].sort((a, b) => a - b) : [0];
}
