import type { ScopeConfig } from '../db/types';

export const DEFAULT_SCOPE: ScopeConfig = {
  type: 'all',
  chunkSize: 13,
  selectedChunks: [0],
  rangeStart: 1,
  rangeEnd: 52,
};
