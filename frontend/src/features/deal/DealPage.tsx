import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CardBack, PlayingCard } from '../../components/PlayingCard';
import { cardLabel } from '../../data/deck';
import { DECK_SIZE, cardAtPosition } from '../../data/mnemonica';
import { useSound } from '../../audio/useSound';
import { shuffledPacket, takeRandomCard } from './draw';

const FLOURISH_MS = 1120;
const LAYER_COUNT = 8;
/** Pixels of edge visible between packet cards, so the deck reads as a deck. */
const LAYER_STEP = 4.6;

type Phase = 'idle' | 'shooting' | 'shown';

function deckDepth(remaining: number): number {
  if (remaining <= 0) return 0;
  return Math.max(1, Math.round((remaining / DECK_SIZE) * LAYER_COUNT));
}

function prefersReducedMotion(): boolean {
  const mode = document.documentElement.dataset.motion;
  if (mode === 'reduced') return true;
  if (mode === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cubic(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Spin hard through the toss, then ease the last bit so the face lands square. */
function spinProgress(t: number): number {
  if (t < 0.72) return (t / 0.72) * 0.9;
  const u = (t - 0.72) / 0.28;
  return 0.9 + 0.1 * easeOutCubic(u);
}

function place(x: number, y: number, z: number, rot: number, scale: number): string {
  return `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rot}deg) scale(${scale})`;
}

export function DealPage() {
  const play = useSound();
  const [packet, setPacket] = useState(shuffledPacket);
  const [phase, setPhase] = useState<Phase>('idle');
  const [flying, setFlying] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const packetRef = useRef(packet);
  const revealedRef = useRef(revealed);
  const phaseRef = useRef(phase);
  packetRef.current = packet;
  revealedRef.current = revealed;
  phaseRef.current = phase;

  const stageRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLDivElement>(null);
  const packetElRef = useRef<HTMLSpanElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 2200);
    return () => window.clearTimeout(id);
  }, [banner]);

  const shoot = useCallback(() => {
    if (phaseRef.current === 'shooting') return;
    const drawn = takeRandomCard(packetRef.current, revealedRef.current);
    packetRef.current = drawn.rest;
    phaseRef.current = 'shooting';
    setPacket(drawn.rest);
    setFlying(drawn.position);
    setPhase('shooting');
    setBanner(drawn.reshuffled ? 'Fresh shuffle' : null);
    play('flourish');
  }, [play]);

  const reshuffle = useCallback(() => {
    if (phaseRef.current === 'shooting') return;
    const next = shuffledPacket();
    packetRef.current = next;
    revealedRef.current = null;
    phaseRef.current = 'idle';
    setPacket(next);
    setRevealed(null);
    setFlying(null);
    setPhase('idle');
    setBanner('Fresh shuffle');
    play('tap');
  }, [play]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select')) {
        return;
      }
      e.preventDefault();
      shoot();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shoot]);

  useLayoutEffect(() => {
    if (phase !== 'shooting' || flying == null) return;
    const stage = stageRef.current;
    const land = landRef.current;
    const packetEl = packetElRef.current;
    const flyer = flyerRef.current;
    const spin = spinRef.current;

    const finishNow = () => {
      setRevealed(flying);
      setPhase('shown');
    };

    if (!stage || !land || !packetEl || !flyer || !spin || prefersReducedMotion()) {
      finishNow();
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const originRect = packetEl.getBoundingClientRect();
    const landRect = land.getBoundingClientRect();
    const startX = originRect.left + originRect.width / 2 - stageRect.left;
    const startY = originRect.top + originRect.height / 2 - stageRect.top;
    const endX = landRect.left + landRect.width / 2 - stageRect.left;
    const endY = landRect.top + landRect.height / 2 - stageRect.top;
    const startScale = Math.max(0.42, Math.min(0.92, originRect.width / Math.max(1, landRect.width)));
    const dir = Math.random() < 0.5 ? -1 : 1;
    const room = Math.max(36, stageRect.width / 2 - landRect.width * 0.62);
    const side = dir * Math.min(room, 64 + Math.random() * 28);
    const endZ = dir * 360;
    const lift = 36 + Math.random() * 20;

    const samples = [0, 0.08, 0.18, 0.34, 0.52, 0.7, 0.86, 1];
    const travelFrames = samples.map((t) => {
      // Launch up and out immediately, then arc back into the slot.
      const x = cubic(t, startX, startX + dir * 78, startX + side, endX);
      const y = cubic(t, startY, startY - 130, endY - lift, endY);
      const spun = spinProgress(t);
      let scale: number;
      if (t < 0.7) scale = startScale + (1.06 - startScale) * easeOutCubic(t / 0.7);
      else scale = 1.06 + (1 - 1.06) * ((t - 0.7) / 0.3);
      return {
        transform: place(x, y, Math.sin(Math.PI * t) * 90, endZ * spun, scale),
        offset: t,
      };
    });

    // 1260° = 3.5 turns. The face is pre-rotated 180°, so this lands face up.
    const flipFrames = samples.map((t) => ({
      transform: `rotateX(${Math.sin(Math.PI * t) * 22}deg) rotateY(${1260 * spinProgress(t)}deg)`,
      offset: t,
    }));

    flyer.style.width = `${landRect.width}px`;
    flyer.style.visibility = 'visible';

    const travel = flyer.animate(travelFrames, {
      duration: FLOURISH_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    const flip = spin.animate(flipFrames, {
      duration: FLOURISH_MS,
      easing: 'linear',
      fill: 'forwards',
    });

    const sparks: HTMLSpanElement[] = [];
    for (let i = 0; i < 8; i += 1) {
      const spark = document.createElement('span');
      spark.className = `flourish-spark${i % 3 === 0 ? ' gold' : ''}`;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const dist = 36 + Math.random() * 78;
      spark.style.left = `${startX + dir * 8}px`;
      spark.style.top = `${startY}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * dist - 10}px`);
      spark.style.animationDelay = `${Math.random() * 50}ms`;
      stage.appendChild(spark);
      sparks.push(spark);
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      finishNow();
    };
    travel.onfinish = finish;
    const backup = window.setTimeout(finish, FLOURISH_MS + 90);

    return () => {
      settled = true;
      travel.cancel();
      flip.cancel();
      window.clearTimeout(backup);
      flyer.style.visibility = 'hidden';
      sparks.forEach((node) => node.remove());
    };
  }, [phase, flying]);

  const depth = deckDepth(packet.length);
  const visibleDepth = phase === 'shooting' ? Math.max(0, depth - 1) : depth;
  const revealedCard = revealed != null ? cardAtPosition(revealed) : null;
  const flyingCard = flying != null ? cardAtPosition(flying) : null;
  const canReshuffle = revealed != null || packet.length < DECK_SIZE;

  return (
    <div className="deal-page">
      <h1>Random card</h1>
      <p className="subtitle">Shoot one out of the deck. The stack number comes with it.</p>

      <div className="flourish-stage" ref={stageRef}>
        <div className="flourish-land" ref={landRef}>
          {phase === 'shown' && revealedCard ? (
            <div className="flourish-landed-wrap" key={revealedCard.code} aria-hidden>
              <PlayingCard card={revealedCard} width="100%" />
            </div>
          ) : (
            <div className="flourish-land-ghost">{phase === 'shooting' ? '' : 'Ready'}</div>
          )}
        </div>

        <div className="flourish-readout" aria-live="polite">
          {phase === 'shown' && revealedCard && revealed != null ? (
            <>
              <div className="flourish-pos" key={revealed}>
                <span>#</span>
                {revealed}
              </div>
              <p className="flourish-name">{cardLabel(revealedCard)}</p>
              <div className="flourish-neighbors">
                <SideCard label="Before" position={revealed > 1 ? revealed - 1 : null} />
                <SideCard label="After" position={revealed < DECK_SIZE ? revealed + 1 : null} />
              </div>
            </>
          ) : (
            <p className="muted flourish-prompt">
              {phase === 'shooting'
                ? 'In the air…'
                : 'Deals through the stack without repeats, then reshuffles.'}
            </p>
          )}
        </div>

        <button
          type="button"
          className={`flourish-deck${phase === 'shooting' ? ' is-firing' : ''}`}
          onClick={shoot}
          disabled={phase === 'shooting'}
          aria-label={phase === 'shooting' ? 'Card in the air' : 'Shoot a card from the deck'}
        >
          <span className="flourish-floor" aria-hidden />
          <span className="flourish-packet" ref={packetElRef}>
            {visibleDepth === 0 ? (
              <span className="flourish-empty-deck">Empty</span>
            ) : (
              Array.from({ length: visibleDepth }, (_, i) => {
                const fromTop = visibleDepth - 1 - i;
                const tuck = phase === 'shooting' ? LAYER_STEP : 0;
                return (
                  <span
                    key={i}
                    className="flourish-layer"
                    style={{
                      zIndex: i + 1,
                      transform: `translate(${fromTop * -0.55}px, ${tuck + fromTop * LAYER_STEP}px)`,
                    }}
                  >
                    <CardBack width="100%" />
                  </span>
                );
              })
            )}
          </span>
        </button>

        <p className="flourish-status muted">
          {banner ??
            (packet.length === 0
              ? 'Deck empty — next shot reshuffles'
              : `${packet.length} left in the deck`)}
        </p>

        <div className="flourish-flyer" ref={flyerRef} aria-hidden>
          <div className="flourish-spin" ref={spinRef}>
            <div className="flourish-edge" />
            <div className="flourish-face flourish-back">
              <div className="flourish-face-inner">
                <CardBack width="100%" />
              </div>
            </div>
            <div className="flourish-face flourish-front">
              <div className="flourish-face-inner">
                {flyingCard ? <PlayingCard card={flyingCard} width="100%" /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flourish-actions">
        <button
          type="button"
          className="btn primary block"
          onClick={shoot}
          disabled={phase === 'shooting'}
        >
          {phase === 'shooting' ? 'Shooting…' : revealed ? 'Shoot another' : 'Shoot a card'}
        </button>
        {canReshuffle && (
          <button
            type="button"
            className="btn ghost block"
            onClick={reshuffle}
            disabled={phase === 'shooting'}
          >
            Reshuffle
          </button>
        )}
      </div>
    </div>
  );
}

function SideCard({ label, position }: { label: string; position: number | null }) {
  const card = position != null ? cardAtPosition(position) : null;
  return (
    <div className="flourish-side">
      {card ? (
        <PlayingCard card={card} width={48} />
      ) : (
        <div className="flourish-side-empty" aria-hidden />
      )}
      <span className="flourish-side-pos">{position != null ? `#${position}` : '—'}</span>
      <span className="flourish-side-label">{label}</span>
    </div>
  );
}
