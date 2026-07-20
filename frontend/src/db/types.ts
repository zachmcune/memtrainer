export type TrainingMode = 'card-to-position' | 'position-to-card';

/** How the training session picks which cards to prompt next. */
export type QueueStrategy = 'spaced' | 'random' | 'dynamic';

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

export const QUEUE_STRATEGIES: { value: QueueStrategy; label: string; help: string }[] = [
  {
    value: 'spaced',
    label: 'Spaced',
    help: 'Review cards when they are due so memory lasts; prioritizes overdue cards in your scope.',
  },
  {
    value: 'random',
    label: 'Random',
    help: 'Shuffled cards from your study scope.',
  },
  {
    value: 'dynamic',
    label: 'Dynamic',
    help: 'Prioritize weak cards and sections you miss most often.',
  },
];

/** Brief flash duration for the optional flash-prompt setting (ms). */
export const FLASH_PROMPT_MS = 1000;
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

/** Identifier of a color scheme; the full registry lives in `theme/themes.ts`. */
export type ThemeId =
  | 'neon-noir'
  | 'emerald-royale'
  | 'crimson-highroller'
  | 'violet-lux'
  | 'azure-ice'
  | 'gold-midnight';

export interface AppSettings {
  id: 'app';
  mode: TrainingMode;
  scope: ScopeConfig;
  /** Cards visible in the Stack tab carousel (independent from training scope). */
  stackScope: ScopeConfig;
  /** Number of prompts per session, or 'all' to cover the whole scope once. */
  sessionLength: number | 'all';
  /** How cards are ordered in a session. */
  queueStrategy: QueueStrategy;
  redrillMissed: boolean;
  /** On a miss, show the cards before/after the quizzed card in stack order. */
  showStackNeighborsOnMiss: boolean;
  /** On a miss, show the fixed group of four stack cards the answer belongs to (1–4, 5–8, …). */
  showStackGroupOnMiss: boolean;
  /**
   * When true, briefly show the prompt (card or position), hide it, then unlock answering.
   */
  flashPrompt: boolean;
  /** Active color scheme. */
  theme: ThemeId;
  /** Master toggle for synthesized sound effects. */
  soundEnabled: boolean;
  /** Sound effect volume, 0–1. */
  soundVolume: number;
  /** When true, disables non-essential animation regardless of OS preference. */
  reducedMotion: boolean;
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
  /** When this card is next due for spaced review (0 = due / new). */
  dueAt: number;
  /** Current spaced-review interval in days (0 = new or relearning). */
  intervalDays: number;
  /** Ease factor for growing intervals (SM-2 style). */
  ease: number;
  /** Successful reviews in a row. */
  reps: number;
  /** Times failed after having progressed. */
  lapses: number;
}