import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel } from '../../data/deck';
import { cardAtPosition, DECK_SIZE } from '../../data/mnemonica';
import { shuffle } from '../training/engine';
import { useSound } from '../../audio/useSound';

type Direction = 'asc' | 'desc';

/** Slot geometry for the scrollable slider (must match CSS). */
const CARD_W = 84;
const GAP = 12;
const STEP = CARD_W + GAP;

/** How many placed cards to keep rendered in the pile (for a light DOM). */
const STACK_DEPTH = 6;

function makeShuffled(): number[] {
  return shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i + 1));
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function OrderPage() {
  const play = useSound();
  const [direction, setDirection] = useState<Direction>('asc');
  const [remaining, setRemaining] = useState<number[]>(makeShuffled);
  const [placed, setPlaced] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const wrongTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  const placedCount = placed.length;
  const nextExpected = direction === 'asc' ? placedCount + 1 : DECK_SIZE - placedCount;
  const done = placedCount === DECK_SIZE;
  const activePos = remaining[activeIndex];
  const activeCard = activePos ? cardAtPosition(activePos) : null;

  const reset = useCallback((dir: Direction) => {
    setDirection(dir);
    setRemaining(makeShuffled());
    setPlaced([]);
    setActiveIndex(0);
    setWrong(false);
    setMistakes(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setFlashIndex(null);
    if (sliderRef.current) sliderRef.current.scrollLeft = 0;
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = sliderRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / STEP);
      setActiveIndex((prev) => {
        const clamped = Math.max(0, Math.min(idx, remaining.length - 1));
        return clamped === prev ? prev : clamped;
      });
    });
  }, [remaining.length]);

  // Re-center the slider on a real card whenever the pile changes.
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || remaining.length === 0) return;
    const idx = Math.max(0, Math.min(activeIndex, remaining.length - 1));
    el.scrollLeft = idx * STEP;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (wrongTimer.current != null) window.clearTimeout(wrongTimer.current);
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const placeActive = useCallback(() => {
    if (done) return;
    const pos = remaining[activeIndex];
    if (pos == null) return;
    if (pos === nextExpected) {
      play('deal');
      setPlaced((p) => [...p, pos]);
      setRemaining((r) => r.filter((_, i) => i !== activeIndex));
      setActiveIndex((i) => Math.max(0, Math.min(i, remaining.length - 2)));
      setWrong(false);
    } else {
      play('wrong');
      setWrong(true);
      setMistakes((m) => m + 1);
      if (wrongTimer.current != null) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setWrong(false), 480);
    }
  }, [done, remaining, activeIndex, nextExpected, play]);

  const selectSlot = useCallback(
    (i: number) => {
      if (i === activeIndex) {
        placeActive();
        return;
      }
      setActiveIndex(i);
      sliderRef.current?.scrollTo({ left: i * STEP, behavior: 'smooth' });
    },
    [activeIndex, placeActive],
  );

  const revealNext = useCallback(() => {
    const idx = remaining.indexOf(nextExpected);
    if (idx < 0) return;
    play('tap');
    setMistakes((m) => m + 1);
    setActiveIndex(idx);
    setFlashIndex(idx);
    sliderRef.current?.scrollTo({ left: idx * STEP, behavior: 'smooth' });
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashIndex(null), 1400);
  }, [remaining, nextExpected, play]);

  useEffect(() => {
    if (done && finishedAt == null) {
      setFinishedAt(Date.now());
      play('win');
    }
  }, [done, finishedAt, play]);

  const changeDirection = (dir: Direction) => {
    if (dir === direction) return;
    play('toggle');
    reset(dir);
  };

  const pct = (placedCount / DECK_SIZE) * 100;
  const stackView = placed.slice(-STACK_DEPTH);

  return (
    <div className="order-page">
      <h1>Order</h1>
      <p className="subtitle">Rebuild the stack from a shuffled deck.</p>

      <div className="seg" role="tablist">
        <button
          type="button"
          className={direction === 'asc' ? 'active' : ''}
          onClick={() => changeDirection('asc')}
        >
          1 &rarr; 52
        </button>
        <button
          type="button"
          className={direction === 'desc' ? 'active' : ''}
          onClick={() => changeDirection('desc')}
        >
          52 &rarr; 1
        </button>
      </div>

      {done ? (
        <div className="order-done">
          <div className="order-done-badge">✦</div>
          <h2 className="order-done-title">Deck sorted!</h2>
          <div className="stat-grid" style={{ marginTop: 6 }}>
            <div className="stat-tile">
              <div className="value">
                {finishedAt ? formatDuration(finishedAt - startedAt) : '—'}
              </div>
              <div className="label">Time</div>
            </div>
            <div className="stat-tile">
              <div className="value" style={{ color: mistakes === 0 ? 'var(--good)' : undefined }}>
                {mistakes}
              </div>
              <div className="label">Slips</div>
            </div>
          </div>
          {mistakes === 0 && (
            <p className="muted center" style={{ marginTop: 12 }}>
              Flawless — a perfect rebuild.
            </p>
          )}
          <button
            className="btn primary block"
            style={{ marginTop: 16 }}
            onClick={() => {
              play('tap');
              reset(direction);
            }}
          >
            Shuffle &amp; play again
          </button>
        </div>
      ) : (
        <>
          <div className="order-progress-row">
            <span className="pill">{placedCount} / {DECK_SIZE} placed</span>
            <span className="pill">{mistakes} slips</span>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${pct}%` }} />
          </div>

          <div className="order-arena">
            <div className="order-target" aria-live="polite">
              <span className="order-target-label">Place position</span>
              <span className="order-target-num">#{nextExpected}</span>
            </div>

            <div className={`order-stack${wrong ? ' shake' : ''}`}>
              {placed.length === 0 ? (
                <div className="order-stack-empty">
                  <span>Pile empty</span>
                  <span className="muted">Place #{nextExpected} to start</span>
                </div>
              ) : (
                stackView.map((pos, i) => {
                  const depth = stackView.length - 1 - i;
                  const isTop = depth === 0;
                  const tilt = (pos % 2 === 0 ? 1 : -1) * Math.min(depth, 4) * 1.6;
                  return (
                    <div
                      key={pos}
                      className="order-stack-card"
                      style={{
                        transform: `translate(-50%, -50%) translateY(${-depth * 3}px) rotate(${tilt}deg)`,
                        zIndex: 20 - depth,
                        filter: `brightness(${1 - depth * 0.08})`,
                      }}
                    >
                      <div className={isTop ? 'order-stack-drop' : undefined}>
                        <PlayingCard card={cardAtPosition(pos)} width={150} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="order-controls">
            <button type="button" className="btn ghost" onClick={revealNext}>
              Reveal
            </button>
            <button
              type="button"
              className="btn primary order-place"
              onClick={placeActive}
              disabled={!activeCard}
            >
              Place{activeCard ? ` ${cardLabel(activeCard)}` : ''}
            </button>
          </div>

          <div
            className="order-slider"
            ref={sliderRef}
            onScroll={onScroll}
            role="listbox"
            aria-label="Shuffled cards"
          >
            <div className="order-slider-spacer" aria-hidden />
            {remaining.map((pos, i) => (
              <button
                key={pos}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`order-slot${i === activeIndex ? ' active' : ''}${
                  flashIndex === i ? ' flash' : ''
                }`}
                onClick={() => selectSlot(i)}
              >
                <PlayingCard card={cardAtPosition(pos)} width={CARD_W} />
              </button>
            ))}
            <div className="order-slider-spacer" aria-hidden />
          </div>
          <p className="muted center order-hint">
            Scroll the deck, tap a card to center it, then tap it again or press Place.
          </p>
        </>
      )}
    </div>
  );
}
