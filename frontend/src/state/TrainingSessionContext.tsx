import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { Rank, Suit } from '../data/deck';
import type { AttemptResult, SessionRecord, TrainingMode } from '../db/types';

export type TrainingPhase = 'idle' | 'running' | 'finished';

export interface RunnerState {
  queue: number[];
  idx: number;
  results: AttemptResult[];
  revealing: boolean;
  lastCorrect: boolean | null;
  lastWasIdk: boolean;
  numStr: string;
  rank: Rank | null;
  suit: Suit | null;
  paused: boolean;
  promptStartedAt: number;
  pausedMs: number;
  pauseStartedAt: number | null;
  sessionStartedAt: number;
  redrilled: boolean;
  mode: TrainingMode;
  scopePositions: number[];
  /** When flash prompt is on: cue is hidden and answering is unlocked after the flash. */
  cueObscured: boolean;
  /** performance.now() deadline for the flash, or null when not flashing / flash done. */
  flashDeadline: number | null;
  /** Remaining flash ms while paused mid-flash. */
  flashPausedRemainingMs: number | null;
}

type TrainingSessionContextValue = {
  phase: TrainingPhase;
  finished: SessionRecord | null;
  runner: RunnerState | null;
  startSession: (runner: RunnerState) => void;
  quitSession: () => void;
  finishSession: (session: SessionRecord) => void;
  patchRunner: (
    patch: Partial<RunnerState> | ((prev: RunnerState) => Partial<RunnerState>),
  ) => void;
  togglePause: () => void;
};

const TrainingSessionContext = createContext<TrainingSessionContextValue | null>(null);

function pauseRunner(runner: RunnerState): RunnerState {
  if (runner.paused) return runner;
  const next: RunnerState = {
    ...runner,
    paused: true,
    pauseStartedAt: performance.now(),
  };
  if (runner.flashDeadline != null) {
    next.flashPausedRemainingMs = Math.max(0, runner.flashDeadline - performance.now());
    next.flashDeadline = null;
  }
  return next;
}

function resumeRunner(runner: RunnerState): RunnerState {
  if (!runner.paused || runner.pauseStartedAt == null) {
    return { ...runner, paused: false, pauseStartedAt: null };
  }
  const next: RunnerState = {
    ...runner,
    paused: false,
    pausedMs: runner.pausedMs + (performance.now() - runner.pauseStartedAt),
    pauseStartedAt: null,
  };
  if (runner.flashPausedRemainingMs != null) {
    next.flashDeadline = performance.now() + runner.flashPausedRemainingMs;
    next.flashPausedRemainingMs = null;
  }
  return next;
}

export function TrainingSessionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [phase, setPhase] = useState<TrainingPhase>('idle');
  const [finished, setFinished] = useState<SessionRecord | null>(null);
  const [runner, setRunner] = useState<RunnerState | null>(null);

  const startSession = useCallback((initial: RunnerState) => {
    setFinished(null);
    setRunner(initial);
    setPhase('running');
  }, []);

  const quitSession = useCallback(() => {
    setRunner(null);
    setFinished(null);
    setPhase('idle');
  }, []);

  const finishSession = useCallback((session: SessionRecord) => {
    setRunner(null);
    setFinished(session);
    setPhase('finished');
  }, []);

  const patchRunner = useCallback(
    (patch: Partial<RunnerState> | ((prev: RunnerState) => Partial<RunnerState>)) => {
      setRunner((prev) => {
        if (!prev) return prev;
        const next = typeof patch === 'function' ? patch(prev) : patch;
        return { ...prev, ...next };
      });
    },
    [],
  );

  const togglePause = useCallback(() => {
    setRunner((prev) => {
      if (!prev) return prev;
      return prev.paused ? resumeRunner(prev) : pauseRunner(prev);
    });
  }, []);

  // Auto-pause when leaving the Train tab so the timer does not run in the background.
  useEffect(() => {
    if (phase !== 'running' || !runner || runner.paused) return;
    if (location.pathname !== '/train') {
      setRunner((prev) => (prev ? pauseRunner(prev) : prev));
    }
  }, [location.pathname, phase, runner?.paused]);

  const value = useMemo(
    () => ({
      phase,
      finished,
      runner,
      startSession,
      quitSession,
      finishSession,
      patchRunner,
      togglePause,
    }),
    [phase, finished, runner, startSession, quitSession, finishSession, patchRunner, togglePause],
  );

  return (
    <TrainingSessionContext.Provider value={value}>{children}</TrainingSessionContext.Provider>
  );
}

export function useTrainingSession(): TrainingSessionContextValue {
  const ctx = useContext(TrainingSessionContext);
  if (!ctx) {
    throw new Error('useTrainingSession must be used within TrainingSessionProvider');
  }
  return ctx;
}

export function promptElapsedMs(runner: RunnerState): number {
  const livePause =
    runner.paused && runner.pauseStartedAt != null
      ? performance.now() - runner.pauseStartedAt
      : 0;
  return performance.now() - runner.promptStartedAt - runner.pausedMs - livePause;
}

export function resetPromptTimer(_runner: RunnerState): Partial<RunnerState> {
  return {
    promptStartedAt: performance.now(),
    pausedMs: 0,
    pauseStartedAt: null,
    paused: false,
  };
}
