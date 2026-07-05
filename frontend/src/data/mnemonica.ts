import { parseCard, type Card } from './deck';

/**
 * The Mnemonica stack (Juan Tamariz), position 1..52.
 * Index 0 corresponds to position 1.
 */
export const MNEMONICA_CODES: string[] = [
  '4C', '2H', '7D', '3C', '4H', '6D', 'AS', '5H', '9S', '2S',
  'QH', '3D', 'QC', '8H', '6S', '5S', '9H', 'KC', '2D', 'JH',
  '3S', '8S', '6H', '10C', '5D', 'KD', '2C', '3H', '8D', '5C',
  'KS', 'JD', '8C', '10S', 'KH', 'JC', '7S', '10H', 'AD', '4S',
  '7H', '4D', 'AC', '9C', 'JS', 'QD', '7C', 'QS', '10D', '6C',
  'AH', '9D',
];

export const DECK_SIZE = MNEMONICA_CODES.length;

/** Ordered list of cards, index 0 = position 1. */
export const MNEMONICA_CARDS: Card[] = MNEMONICA_CODES.map(parseCard);

/** 1-based position (1..52) for a given card code, or -1 if absent. */
export function positionOf(code: string): number {
  const idx = MNEMONICA_CODES.indexOf(code.toUpperCase());
  return idx === -1 ? -1 : idx + 1;
}

/** Card at a given 1-based position. */
export function cardAtPosition(position: number): Card {
  const card = MNEMONICA_CARDS[position - 1];
  if (!card) throw new Error(`Invalid position: ${position}`);
  return card;
}

/** Four consecutive stack positions surrounding a miss (for context on wrong answers). */
export function stackGroupPositions(position: number): number[] {
  const start = Math.max(1, Math.min(position - 1, DECK_SIZE - 3));
  return [start, start + 1, start + 2, start + 3];
}
