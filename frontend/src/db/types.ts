export type TrainingMode = 'card-to-position' | 'position-to-card';

export const TRAINING_MODES: { value: TrainingMode; label: string; help: string }[] = [
  {
    value: 'card-to-position',
    label: 'Card \u2192 Position',
    help: 'See a card, type its stack number.',
  },
  {
    value: 'position-to-card',
    label: 'Position \u2192 Card',
    help: 'See a stack number, enter the card.',
  },
];

/** A single answered prompt within a session. */
export interface AttemptResult {
  /** Canonical card code, e.g. "4C". */
  code: string;
  /** 1-based stack position. */
  position: number;
  mode: TrainingMode;
  /** What the user submitted (position as string, or a card code). */
  userAnswer: string;
  correct: boolean;
  timeMs: number;
  timestamp: number;
}

export type ScopeType = 'all' | 'chunks' | 'range';

export interface ScopeConfig {
  type: ScopeType;
  /** Size of each chunk when type === 'chunks'. */
  chunkSize: number;
  /** 0-based chunk indices selected when type === 'chunks'. */
  selectedChunks: number[];
  /** Inclusive 1-based range when type === 'range'. */
  rangeStart: number;
  rangeEnd: number;
}

export interface AppSettings {
  id: 'app';
  mode: TrainingMode;
  scope: ScopeConfig;
  /** Cards visible in the Stack tab carousel (independent from training scope). */
  stackScope: ScopeConfig;
  /** Number of prompts per session, or 'all' to cover the whole scope once. */
  sessionLength: number | 'all';
  redrillMissed: boolean;
  /** On a miss, show the cards before/after the quizzed card in stack order. */
  showStackNeighborsOnMiss: boolean;
  /** On a miss, show the fixed group of four stack cards the answer belongs to (1–4, 5–8, …). */
  showStackGroupOnMiss: boolean;
}

export interface SessionRecord {
  id?: number;
  startedAt: number;
  finishedAt: number;
  mode: TrainingMode;
  /** 1-based positions that were in scope for this session. */
  scopePositions: number[];
  results: AttemptResult[];
  total: number;
  correct: number;
}

/** Aggregate per (mode, card) accuracy record. Primary key is `${mode}__${code}`. */
export interface CardStat {
  id: string;
  mode: TrainingMode;
  code: string;
  position: number;
  attempts: number;
  correct: number;
  totalTimeMs: number;
  lastSeen: number;
}
