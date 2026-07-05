import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel, type Rank, type Suit } from '../../data/deck';
import { cardAtPosition } from '../../data/mnemonica';
import { repository } from '../../db/repository';
import { TRAINING_MODES, type AttemptResult, type SessionRecord } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { SessionSummary } from '../stats/SessionSummary';
import { buildQueue, resolveScopePositions, shuffle } from './engine';
import { CardPicker, NumberPad } from './inputs';
import { StackNeighborReveal } from './StackNeighborReveal';
import { StackGroupReveal } from './StackGroupReveal';

type Phase = 'idle' | 'running' | 'finished';

/** Stored in attempt records when the user taps "I don't know". */
export const IDK_ANSWER = '—';

export function TrainingPage() {
  const { settings, loading } = useSettings();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [finished, setFinished] = useState<SessionRecord | null>(null);

  const scopePositions = useMemo(
    () => resolveScopePositions(settings.scope),
    [settings.scope],
  );

  const startSession = useCallback(() => {
    setFinished(null);
    setPhase('running');
  }, []);

  const handleFinish = useCallback((session: SessionRecord) => {
    void repository.saveSession(session);
    setFinished(session);
    setPhase('finished');
  }, []);

  if (loading) {
    return <div className="empty">Loading…</div>;
  }

  if (phase === 'running') {
    return (
      <TrainingRunner
        key={Date.now()}
        onFinish={handleFinish}
        onQuit={() => setPhase('idle')}
      />
    );
  }

  if (phase === 'finished' && finished) {
    return (
      <div>
        <h1>Session complete</h1>
        <p className="subtitle">Nice work. Here is how you did.</p>
        <SessionSummary results={finished.results} />
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn primary block" onClick={startSession}>
            Train again
          </button>
          <button className="btn block" onClick={() => navigate('/stats')}>
            All stats
          </button>
        </div>
      </div>
    );
  }

  const modeInfo = TRAINING_MODES.find((m) => m.value === settings.mode)!;
  return (
    <div>
      <h1>Train</h1>
      <p className="subtitle">{modeInfo.help}</p>
      <div className="card-panel">
        <div className="row spread">
          <span className="muted">Mode</span>
          <span className="pill">{modeInfo.label}</span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">In scope</span>
          <span className="pill">{scopePositions.length} cards</span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">Session length</span>
          <span className="pill">
            {settings.sessionLength === 'all' ? 'Whole scope' : `${settings.sessionLength} prompts`}
          </span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">Re-drill misses</span>
          <span className="pill">{settings.redrillMissed ? 'On' : 'Off'}</span>
        </div>
      </div>
      {scopePositions.length === 0 ? (
        <div className="banner warn">
          No cards are selected. Choose at least one section in Settings.
        </div>
      ) : (
        <button className="btn primary block" onClick={startSession}>
          Start session
        </button>
      )}
      <button
        className="btn ghost block"
        style={{ marginTop: 10 }}
        onClick={() => navigate('/settings')}
      >
        Adjust settings
      </button>
    </div>
  );
}

function TrainingRunner({
  onFinish,
  onQuit,
}: {
  onFinish: (session: SessionRecord) => void;
  onQuit: () => void;
}) {
  const { settings } = useSettings();
  const mode = settings.mode;

  const scopePositions = useMemo(
    () => resolveScopePositions(settings.scope),
    [settings.scope],
  );
  const [queue, setQueue] = useState<number[]>(() =>
    buildQueue(scopePositions, settings.sessionLength),
  );
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [revealing, setRevealing] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastWasIdk, setLastWasIdk] = useState(false);
  const [numStr, setNumStr] = useState('');
  const [rank, setRank] = useState<Rank | null>(null);
  const [suit, setSuit] = useState<Suit | null>(null);
  const redrilledRef = useRef(false);
  const startRef = useRef<number>(performance.now());
  const startedAtRef = useRef<number>(Date.now());

  const position = queue[idx];
  const card = position ? cardAtPosition(position) : null;

  useEffect(() => {
    startRef.current = performance.now();
  }, [idx]);

  const resetInput = useCallback(() => {
    setNumStr('');
    setRank(null);
    setSuit(null);
  }, []);

  const recordAttempt = useCallback(
    (userAnswer: string, correct: boolean, wasIdk = false) => {
      if (revealing || !card) return;
      const timeMs = performance.now() - startRef.current;
      const result: AttemptResult = {
        code: card.code,
        position,
        mode,
        userAnswer,
        correct,
        timeMs,
        timestamp: Date.now(),
      };
      setResults((prev) => [...prev, result]);
      setLastCorrect(correct);
      setLastWasIdk(wasIdk);
      setRevealing(true);
    },
    [revealing, card, mode, position],
  );

  const submit = useCallback(() => {
    if (revealing || !card) return;
    if (mode === 'card-to-position') {
      if (!numStr) return;
      recordAttempt(numStr, Number(numStr) === position);
    } else {
      if (!rank || !suit) return;
      const userAnswer = `${rank}${suit}`;
      recordAttempt(userAnswer, userAnswer === card.code);
    }
  }, [revealing, card, mode, numStr, rank, suit, position, recordAttempt]);

  const submitDontKnow = useCallback(() => {
    recordAttempt(IDK_ANSWER, false, true);
  }, [recordAttempt]);

  const advance = useCallback(() => {
    const allResults = results;
    const isLast = idx >= queue.length - 1;
    if (isLast) {
      // Optionally append a re-drill pass over unique missed positions.
      if (settings.redrillMissed && !redrilledRef.current) {
        redrilledRef.current = true;
        const missed = [
          ...new Set(allResults.filter((r) => !r.correct).map((r) => r.position)),
        ];
        if (missed.length > 0) {
          setQueue((q) => [...q, ...shuffle(missed)]);
          setIdx((i) => i + 1);
          setRevealing(false);
          setLastWasIdk(false);
          resetInput();
          return;
        }
      }
      const session: SessionRecord = {
        startedAt: startedAtRef.current,
        finishedAt: Date.now(),
        mode,
        scopePositions,
        results: allResults,
        total: allResults.length,
        correct: allResults.filter((r) => r.correct).length,
      };
      onFinish(session);
      return;
    }
    setIdx((i) => i + 1);
    setRevealing(false);
    setLastWasIdk(false);
    resetInput();
  }, [results, idx, queue.length, settings.redrillMissed, mode, scopePositions, onFinish, resetInput]);

  // Hardware keyboard support.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealing) advance();
        else submit();
        return;
      }
      if (revealing) return;
      if (mode === 'card-to-position') {
        if (/^[0-9]$/.test(e.key)) {
          setNumStr((s) => (s.length >= 2 ? s : s + e.key));
        } else if (e.key === 'Backspace') {
          setNumStr((s) => s.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [revealing, advance, submit, mode]);

  if (!card) {
    return <div className="empty">Nothing to train.</div>;
  }

  const progress = ((idx + (revealing ? 1 : 0)) / queue.length) * 100;

  return (
    <div className="trainer">
      <div className="row spread" style={{ width: '100%' }}>
        <button className="pill" onClick={onQuit} style={{ cursor: 'pointer' }}>
          ✕ Quit
        </button>
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
              />
              <NumberPad
                onDigit={(d) => setNumStr((s) => (s.length >= 2 ? s : s + d))}
                onBackspace={() => setNumStr((s) => s.slice(0, -1))}
                onSubmit={submit}
                canSubmit={numStr.length > 0}
              />
            </>
          ) : (
            <CardPicker
              rank={rank}
              suit={suit}
              onRank={setRank}
              onSuit={setSuit}
              onSubmit={submit}
            />
          )}
          <button
            type="button"
            className="btn ghost idk-btn"
            onClick={submitDontKnow}
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
          <button className="btn primary block" onClick={advance} style={{ maxWidth: 360 }}>
            {idx >= queue.length - 1 ? 'Finish' : 'Next'}
          </button>
        </>
      )}
    </div>
  );
}
