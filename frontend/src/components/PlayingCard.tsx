import type { FC, SVGProps } from 'react';
import * as PlayingCards from '@letele/playing-cards';
import { cardAssetKey, cardLabel, type Card } from '../data/deck';

type CardSvg = FC<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

const deck = PlayingCards as unknown as Record<string, CardSvg>;

interface PlayingCardProps {
  card: Card;
  /** CSS width; the classic 2.5:3.5 aspect ratio is preserved automatically. */
  width?: number | string;
  className?: string;
}

/**
 * Renders an authentic classic (CC0) card face as scalable SVG.
 * The card art keeps the standard 5:7 poker ratio.
 */
export function PlayingCard({ card, width = 200, className }: PlayingCardProps) {
  const Svg = deck[cardAssetKey(card)];
  const w = typeof width === 'number' ? `${width}px` : width;

  if (!Svg) {
    return (
      <div
        className={className}
        style={{ width: w, aspectRatio: '5 / 7' }}
        role="img"
        aria-label={cardLabel(card)}
      />
    );
  }

  return (
    <div
      className={`playing-card ${className ?? ''}`}
      style={{ width: w, aspectRatio: '5 / 7', lineHeight: 0 }}
      role="img"
      aria-label={cardLabel(card)}
    >
      <Svg
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
}

/** The classic patterned card back (used before revealing an answer). */
export function CardBack({ width = 200, className }: { width?: number | string; className?: string }) {
  const Svg = deck['B1'];
  const w = typeof width === 'number' ? `${width}px` : width;
  return (
    <div
      className={`playing-card ${className ?? ''}`}
      style={{ width: w, aspectRatio: '5 / 7', lineHeight: 0 }}
      role="img"
      aria-label="Card back"
    >
      {Svg ? (
        <Svg
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}
    </div>
  );
}
