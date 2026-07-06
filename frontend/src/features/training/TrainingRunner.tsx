import { useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel } from '../../data/deck';
import { cardAtPosition } from '../../data/mnemonica';
import { repository } from '../../db/repository';
import type { AttemptResult, SessionRecord } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import {
  promptElapsedMs,
  resetPromptTimer,
  useTrainingSession,
  type RunnerState,
} from '../../state/TrainingSessionContext';
import { shuffle } from './engine';
import { CardPicker, NumberPad } from './inputs';
import { StackNeighborReveal } from './StackNeighborReveal';
import { StackGroupReveal } from './StackGroupReveal';
import { useSound } from '../../audio/useSound';

/** Stored in attempt records when the user taps "I don't know". */
export const IDK_ANSWER = '—';

export function TrainingRunner() {
  const { runner } = useTrainingSession();
  if (!runner) {
    return <div className="empty">Preparing session…</div>;
  }
  return <TrainingRunnerActive runner={runner} />;
}

function TrainingRunnerActive({ runner }: { runner: RunnerState }) {
  const { settings } = useSettings();
  const { patchRunner, togglePause, finishSession, quitSession } = useTrainingSession();
  const play = useSound();

  const {
    queue,
    idx,
    results,
    revealing,
    lastCorrect,
    lastWasIdk,
    numStr,
    rank,
    suit,
    paused,
    mode,
    scopePositions,
    redrilled,
    sessionStartedAt,
  } = runner;

  const position = queue[idx];
  const card = position ? cardAtPosition(position) : null;

  const recordAttempt = useCallback(
    (userAnswer: string, correct: boolean, wasIdk = false) => {
      if (revealing || paused || !card) return;
      const timeMs = promptElapsedMs(runner);
      const result: AttemptResult = {
        code: card.code,
        position,
        mode,
        userAnswer,
        correct,
        timeMs,
        timestamp: Date.now(),
      };
      play(correct ? 'correct' : 'wrong');
      patchRunner({
        results: [...results, result],
        lastCorrect: correct,
        lastWasIdk: wasIdk,
        revealing: true,
      });
    },
    [revealing, paused, card, runner, mode, position, results, patchRunner, play],
  );

  const submit = useCallback(() => {
    if (revealing || paused || !card) return;
    if (mode === 'card-to-position') {
      if (!numStr) return;
      recordAttempt(numStr, Number(numStr) === position);
    } else {
      if (!rank || !suit) return;
      const userAnswer = `${rank}${suit}`;
      recordAttempt(userAnswer, userAnswer === card.code);
    }
  }, [revealing, paused, card, mode, numStr, rank, suit, position, recordAttempt]);

  const submitDontKnow = useCallback(() => {
    recordAttempt(IDK_ANSWER, false, true);
  }, [recordAttempt]);

  const advance = useCallback(() => {
    if (paused) return;
    const allResults = results;
    const isLast = idx >= queue.length - 1;
    if (isLast) {
      if (settings.redrillMissed && !redrilled) {
        const missed = [
          ...new Set(allResults.filter((r) => !r.correct).map((r) => r.position)),
        ];
        if (missed.length > 0) {
          play('deal');
          patchRunner((prev) => ({
            queue: [...prev.queue, ...shuffle(missed)],
            idx: prev.idx + 1,
            revealing: false,
            lastWasIdk: false,
            redrilled: true,
            numStr: '',
            rank: null,
            suit: null,
            ...resetPromptTimer(prev),
          }));
          return;
        }
      }
      const session: SessionRecord = {
        startedAt: sessionStartedAt,
        finishedAt: Date.now(),
        mode,
        scopePositions,
        results: allResults,
        total: allResults.length,
        correct: allResults.filter((r) => r.correct).length,
      };
      void repository.saveSession(session);
      play('win');
      finishSession(session);
      return;
    }
    play('deal');
    patchRunner((prev) => ({
      idx: prev.idx + 1,
      revealing: false,
      lastWasIdk: false,
      numStr: '',
      rank: null,
      suit: null,
      ...resetPromptTimer(prev),
    }));
  }, [
    paused,
    results,
    idx,
    queue.length,
    settings.redrillMissed,
    redrilled,
    sessionStartedAt,
    mode,
    scopePositions,
    patchRunner,
    finishSession,
    play,
  ]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paused) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealing) advance();
        else submit();
        return;
      }
      if (revealing) return;
      if (mode === 'card-to-position') {
        if (/^[0-9]$/.test(e.key)) {
          patchRunner({ numStr: numStr.length >= 2 ? numStr : numStr + e.key });
        } else if (e.key === 'Backspace') {
          patchRunner({ numStr: numStr.slice(0, -1) });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paused, revealing, advance, submit, mode, numStr, patchRunner]);

  if (!card) {
    return <div className="empty">Nothing to train.</div>;
  }

  const progress = ((idx + (revealing ? 1 : 0)) / queue.length) * 100;
  const inputsDisabled = paused || revealing;

  return (
    <div className={`trainer${paused ? ' trainer-paused' : ''}`}>
      <div className="row spread" style={{ width: '100%' }}>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="pill"
            onClick={() => {
              play('tap');
              quitSession();
            }}
            style={{ cursor: 'pointer' }}
          >
            ✕ Quit
          </button>
          <button
            type="button"
            className={`pill${paused ? ' active' : ''}`}
            onClick={() => {
              play('toggle');
              togglePause();
            }}
            style={{ cursor: 'pointer' }}
            aria-pressed={paused}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
        <span className="pill">
          {Math.min(idx + 1, queue.length)} / {queue.length}
        </span>
      </div>
      <div className="progress-bar">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="prompt-area">
        {mode === 'card-to-position' ? (
          <PlayingCard card={card} width={190} />
        ) : (
          <div className="position-badge">
            {position}
            <small>What card is at this position?</small>
          </div>
        )}
      </div>

      {!revealing ? (
        <>
          {mode === 'card-to-position' ? (
            <>
              <input
                className="answer-input"
                value={numStr}
                readOnly
                placeholder="—"
                inputMode="none"
                aria-label="Your answer"
                disabled={inputsDisabled}
              />
              <NumberPad
                onDigit={(d) =>
                  patchRunner({ numStr: numStr.length >= 2 ? numStr : numStr + d })
                }
                onBackspace={() => patchRunner({ numStr: numStr.slice(0, -1) })}
                onSubmit={submit}
                canSubmit={numStr.length > 0 && !paused}
              />
            </>
          ) : (
            <div className={paused ? 'inputs-disabled' : undefined}>
              <CardPicker
                rank={rank}
                suit={suit}
                onRank={(r) => !paused && patchRunner({ rank: r })}
                onSuit={(s) => !paused && patchRunner({ suit: s })}
                onSubmit={submit}
              />
            </div>
          )}
          <button
            type="button"
            className="btn ghost idk-btn"
            onClick={submitDontKnow}
            disabled={paused}
          >
            I don&apos;t know
          </button>
        </>
      ) : (
        <>
          <div className={`feedback ${lastCorrect ? 'good' : 'bad'}`}>
            {lastCorrect
              ? 'Correct!'
              : lastWasIdk
                ? "That's okay — here's the answer:"
                : 'Not quite.'}
            {!lastCorrect && settings.showStackGroupOnMiss ? (
              <StackGroupReveal position={position} card={card} />
            ) : !lastCorrect && settings.showStackNeighborsOnMiss ? (
              <StackNeighborReveal position={position} card={card} />
            ) : (
              <div className="reveal">
                <PlayingCard card={card} width={70} />
                <div>
                  <div style={{ fontWeight: 700 }}>#{position}</div>
                  <div className="muted">{cardLabel(card)}</div>
                </div>
              </div>
            )}
          </div>
          <button
            className="btn primary block"
            onClick={advance}
            style={{ maxWidth: 360 }}
            disabled={paused}
          >
            {idx >= queue.length - 1 ? 'Finish' : 'Next'}
          </button>
        </>
      )}

      {paused && (
        <div className="pause-overlay" role="status">
          <p className="pause-title">Paused</p>
          <p className="muted pause-note">Your session is saved. Switch tabs or tap Resume.</p>
          <button
            type="button"
            className="btn primary block"
            onClick={() => {
              play('toggle');
              togglePause();
            }}
          >
            Resume training
          </button>
        </div>
      )}
    </div>
  );
}

export function buildInitialRunnerState(
  queue: number[],
  mode: RunnerState['mode'],
  scopePositions: number[],
): RunnerState {
  const now = performance.now();
  return {
    queue,
    idx: 0,
    results: [],
    revealing: false,
    lastCorrect: null,
    lastWasIdk: false,
    numStr: '',
    rank: null,
    suit: null,
    paused: false,
    promptStartedAt: now,
    pausedMs: 0,
    pauseStartedAt: null,
    sessionStartedAt: Date.now(),
    redrilled: false,
    mode,
    scopePositions,
  };
}

export function TrainingResumeBanner() {
  const { phase, runner } = useTrainingSession();
  const location = useLocation();

  if (phase !== 'running' || !runner || location.pathname === '/train') {
    return null;
  }

  return (
    <Link to="/train" className="banner training-resume-banner">
      Training paused ({Math.min(runner.idx + 1, runner.queue.length)}/{runner.queue.length}) ·
      Tap to resume
    </Link>
  );
}
