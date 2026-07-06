import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { CollapsibleScopePanel } from '../../components/CollapsibleScopePanel';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel } from '../../data/deck';
import { cardAtPosition } from '../../data/mnemonica';
import { useSettings } from '../../state/SettingsContext';
import { resolveScopePositions } from '../training/engine';
import { useSound } from '../../audio/useSound';

const VISIBLE_RADIUS = 2;
const MIN_SWIPE_PX = 36;

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
  const play = useSound();
  const positions = useMemo(
    () => resolveScopePositions(settings.stackScope),
    [settings.stackScope],
  );

  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideAnimating, setSlideAnimating] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const positionsRef = useRef<number[]>([]);
  const stageWidthRef = useRef(320);
  const dragRef = useRef<{ startX: number; pointerId: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDragPxRef = useRef(0);

  indexRef.current = index;
  positionsRef.current = positions;

  useEffect(() => {
    setIndex((i) => clampIndex(i, positions.length));
  }, [positions]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateWidth = () => {
      stageWidthRef.current = el.clientWidth || 320;
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [positions.length]);

  const flushDragPx = useCallback(() => {
    rafRef.current = null;
    setDragPx(pendingDragPxRef.current);
  }, []);

  const scheduleDragPx = useCallback(
    (px: number) => {
      pendingDragPxRef.current = px;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushDragPx);
      }
    },
    [flushDragPx],
  );

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const goTo = useCallback(
    (next: number) => {
      const clamped = clampIndex(next, positionsRef.current.length);
      if (clamped === indexRef.current) {
        setSlideAnimating(true);
        setDragPx(0);
        return;
      }
      setSlideAnimating(true);
      setDragPx(0);
      setIndex(clamped);
      play('deal');
    },
    [play],
  );

  const goPrev = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);

  const finishDrag = useCallback(
    (deltaX: number) => {
      const width = stageWidthRef.current;
      const threshold = Math.max(MIN_SWIPE_PX, width * 0.14);
      const cur = indexRef.current;
      const max = positionsRef.current.length;

      setIsDragging(false);
      setDragPx(0);
      setSlideAnimating(true);

      if (deltaX <= -threshold && cur < max - 1) {
        setIndex(cur + 1);
        play('deal');
      } else if (deltaX >= threshold && cur > 0) {
        setIndex(cur - 1);
        play('deal');
      }
    },
    [play],
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
    if (positionsRef.current.length === 0) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    dragRef.current = { startX: e.clientX, pointerId: e.pointerId };
    setIsDragging(true);
    setSlideAnimating(false);
    setDragPx(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    scheduleDragPx(e.clientX - drag.startX);
  };

  const endDrag = (clientX: number, pointerId: number) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    finishDrag(clientX - drag.startX);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    endDrag(e.clientX, e.pointerId);
  };

  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    endDrag(e.clientX, e.pointerId);
  };

  if (loading) return <div className="empty">Loading…</div>;

  const stageWidth = stageWidthRef.current;
  const stackPosition = positions[index];
  const card = stackPosition ? cardAtPosition(stackPosition) : null;
  const useTransition = slideAnimating && !isDragging;

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

      <CollapsibleScopePanel
        scope={settings.stackScope}
        onChange={(stackScope) => update({ stackScope })}
        idPrefix="stack-"
        defaultCollapsed
      />
      <p className="muted deck-scope-count">
        {positions.length} card{positions.length === 1 ? '' : 's'} in view
        {positions.length > 0 && index < positions.length
          ? ` · viewing ${index + 1} of ${positions.length}`
          : ''}
      </p>

      {positions.length === 0 ? (
        <div className="card-panel center muted deck-empty">
          No cards selected. Expand &ldquo;Cards to show&rdquo; above and pick a section.
        </div>
      ) : (
        <>
          <div ref={stageRef} className="deck-stage">
            <div className="deck-stage-floor" aria-hidden />
            <div
              ref={carouselRef}
              className="deck-carousel"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              role="region"
              aria-label="Mnemonica stack carousel"
              aria-live="polite"
            >
              {slots.map(({ key, offset, card: slotCard }) => (
                <div
                  key={key}
                  className={`deck-card-slot${offset === 0 ? ' deck-card-slot-center' : ''}`}
                  style={{
                    ...cardStyle(offset, dragPx, stageWidth),
                    transition: useTransition
                      ? 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.36s ease'
                      : 'none',
                  }}
                  onTransitionEnd={() => setSlideAnimating(false)}
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
