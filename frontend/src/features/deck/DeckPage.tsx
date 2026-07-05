import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel } from '../../data/deck';
import { DECK_SIZE, MNEMONICA_CARDS } from '../../data/mnemonica';

const SWIPE_THRESHOLD_PX = 48;
const VISIBLE_RADIUS = 2;

function clampIndex(value: number): number {
  return Math.max(0, Math.min(DECK_SIZE - 1, value));
}

function cardStyle(offset: number, dragPx: number, width: number) {
  const dragUnits = width > 0 ? dragPx / width : 0;
  const x = offset + dragUnits;
  const abs = Math.abs(x);
  const translateX = x * 132;
  const rotateY = x * -38;
  const scale = Math.max(0.68, 1 - abs * 0.16);
  const translateZ = -abs * 90;
  const opacity = Math.max(0.2, 1 - abs * 0.38);
  const zIndex = 200 - Math.round(abs * 20);

  return {
    transform: `translate(-50%, -50%) translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    zIndex,
    pointerEvents: abs < 0.5 ? ('auto' as const) : ('none' as const),
  };
}

export function DeckPage() {
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; pointerId: number } | null>(null);

  const goTo = useCallback((next: number) => {
    setAnimating(true);
    setIndex(clampIndex(next));
    setDragPx(0);
  }, []);

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  const finishDrag = useCallback(
    (deltaX: number) => {
      setAnimating(true);
      setDragPx(0);
      if (deltaX <= -SWIPE_THRESHOLD_PX) goTo(index + 1);
      else if (deltaX >= SWIPE_THRESHOLD_PX) goTo(index - 1);
    },
    [goTo, index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (animating) return;
    dragRef.current = { startX: e.clientX, pointerId: e.pointerId };
    setAnimating(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDragPx(e.clientX - drag.startX);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    finishDrag(e.clientX - drag.startX);
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setAnimating(true);
    setDragPx(0);
  };

  const stageWidth = stageRef.current?.clientWidth ?? 320;
  const card = MNEMONICA_CARDS[index];
  const position = index + 1;

  const slots = [];
  for (let i = index - VISIBLE_RADIUS; i <= index + VISIBLE_RADIUS; i += 1) {
    if (i < 0 || i >= DECK_SIZE) continue;
    const offset = i - index;
    slots.push({ i, offset, card: MNEMONICA_CARDS[i] });
  }

  return (
    <div className="deck-page">
      <h1>Stack</h1>
      <p className="subtitle">Swipe through the full Mnemonica order.</p>

      <div
        ref={stageRef}
        className="deck-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="region"
        aria-label="Mnemonica stack carousel"
        aria-live="polite"
      >
        <div className="deck-stage-floor" aria-hidden />
        <div className="deck-carousel">
          {slots.map(({ i, offset, card: slotCard }) => (
            <div
              key={i}
              className={`deck-card-slot${offset === 0 ? ' deck-card-slot-center' : ''}`}
              style={{
                ...cardStyle(offset, dragPx, stageWidth),
                transition: animating
                  ? 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s ease'
                  : 'none',
              }}
              onTransitionEnd={() => setAnimating(false)}
            >
              <PlayingCard card={slotCard} width={offset === 0 ? 210 : 170} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="deck-nav deck-nav-prev"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          disabled={index === 0}
          aria-label="Previous card"
        >
          ‹
        </button>
        <button
          type="button"
          className="deck-nav deck-nav-next"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          disabled={index === DECK_SIZE - 1}
          aria-label="Next card"
        >
          ›
        </button>
      </div>

      <div className="deck-position">
        <span className="deck-position-num">#{position}</span>
        <span className="deck-position-of">of {DECK_SIZE}</span>
      </div>
      <p className="deck-card-name">{cardLabel(card)}</p>
    </div>
  );
}
