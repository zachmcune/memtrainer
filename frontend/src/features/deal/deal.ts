import type { DealMode } from '../../db/types';

export const DEAL_MODES: { value: DealMode; label: string; help: string }[] = [
  {
    value: 'card',
    label: 'Card',
    help: 'A spectator names a card. Recall its stack number, then reveal.',
  },
  {
    value: 'number',
    label: 'Number',
    help: 'A spectator names a position. Recall the card, then reveal.',
  },
  {
    value: 'both',
    label: 'Both',
    help: 'Independent card and number — practice any-card-at-any-number construction.',
  },
];

export interface DealDraw {
  /** Stack position of the named / drawn card. */
  cardPosition: number;
  /**
   * Named number (1-based). Same as `cardPosition` in card and number modes;
   * independently rolled in both (ACAAN) mode.
   */
  numberPosition: number;
}

export interface DealResult {
  draw: DealDraw;
  pile: number[];
  /** True when unique mode had to reshuffle an empty shoe for this draw. */
  reshuffled: boolean;
}

export function shuffleCopy<T>(input: T[], rng: () => number = Math.random): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickRandomInScope(scope: number[], rng: () => number = Math.random): number {
  if (scope.length === 0) {
    throw new Error('Cannot pick from an empty scope');
  }
  return scope[Math.floor(rng() * scope.length)]!;
}

/**
 * Draw the next in-scope position. When `noRepeats` is set, values come from a
 * shuffled shoe that reshuffles only after every position has been dealt.
 */
export function createDealDraw(
  mode: DealMode,
  pile: number[],
  scope: number[],
  noRepeats: boolean,
  rng: () => number = Math.random,
): DealResult | null {
  if (scope.length === 0) return null;

  if (!noRepeats) {
    const cardPosition = pickRandomInScope(scope, rng);
    const numberPosition = mode === 'both' ? pickRandomInScope(scope, rng) : cardPosition;
    return {
      draw: { cardPosition, numberPosition },
      pile,
      reshuffled: false,
    };
  }

  let nextPile = pile;
  let reshuffled = false;
  if (nextPile.length === 0) {
    nextPile = shuffleCopy(scope, rng);
    reshuffled = pile.length === 0;
  }

  const cardPosition = nextPile[0]!;
  nextPile = nextPile.slice(1);
  const numberPosition = mode === 'both' ? pickRandomInScope(scope, rng) : cardPosition;

  return {
    draw: { cardPosition, numberPosition },
    pile: nextPile,
    // First deal of a fresh page also starts from an empty pile; callers treat
    // that as a new shoe rather than a mid-session reshuffle.
    reshuffled,
  };
}
