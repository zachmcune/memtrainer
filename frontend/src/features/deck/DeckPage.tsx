import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ScopeControls } from '../../components/ScopeControls';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel } from '../../data/deck';
import { cardAtPosition } from '../../data/mnemonica';
import { useSettings } from '../../state/SettingsContext';
import { resolveScopePositions } from '../training/engine';

const SWIPE_THRESHOLD_PX = 48;
const VISIBLE_RADIUS = 2;

function clampIndex(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(max - 1, value));
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
  const { settings, update, loading } = useSettings();
  const positions = useMemo(
    () => resolveScopePositions(settings.stackScope),
    [settings.stackScope],
  );
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; pointerId: number } | null>(null);

  useEffect(() => {
    setIndex((i) => clampIndex(i, positions.length));
  }, [positions]);

  const goTo = useCallback(
    (next: number) => {
      setAnimating(true);
      setIndex(clampIndex(next, positions.length));
      setDragPx(0);
    },
    [positions.length],
  );

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
    if (animating || positions.length === 0) return;
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

  if (loading) return <div className="empty">Loading…</div>;

  const stageWidth = stageRef.current?.clientWidth ?? 320;
  const stackPosition = positions[index];
  const card = stackPosition ? cardAtPosition(stackPosition) : null;

  const slots = [];
  if (stackPosition && card) {
    for (let slot = index - VISIBLE_RADIUS; slot <= index + VISIBLE_RADIUS; slot += 1) {
      if (slot < 0 || slot >= positions.length) continue;
      const pos = positions[slot];
      const offset = slot - index;
      slots.push({ key: pos, offset, card: cardAtPosition(pos) });
    }
  }

  return (
    <div className="deck-page">
      <h1>Stack</h1>
      <p className="subtitle">Swipe through cards in Mnemonica order.</p>

      <h2 className="deck-scope-heading">Cards to show</h2>
      <ScopeControls
        scope={settings.stackScope}
        onChange={(stackScope) => update({ stackScope })}
        idPrefix="stack-"
      />
      <p className="muted deck-scope-count">
        {positions.length} card{positions.length === 1 ? '' : 's'} in view
        {positions.length > 0 && index < positions.length
          ? ` · viewing ${index + 1} of ${positions.length}`
          : ''}
      </p>

      {positions.length === 0 ? (
        <div className="card-panel center muted deck-empty">
          No cards selected. Choose at least one section above.
        </div>
      ) : (
        <>
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
              {slots.map(({ key, offset, card: slotCard }) => (
                <div
                  key={key}
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
              disabled={index >= positions.length - 1}
              aria-label="Next card"
            >
              ›
            </button>
          </div>

          {card && stackPosition && (
            <>
              <div className="deck-position">
                <span className="deck-position-num">#{stackPosition}</span>
                <span className="deck-position-of">of 52</span>
              </div>
              <p className="deck-card-name">{cardLabel(card)}</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
