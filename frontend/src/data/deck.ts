export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface Card {
  /** Canonical code, e.g. "4C", "10H", "AS". */
  code: string;
  rank: Rank;
  suit: Suit;
}

export const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
export const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

export const SUIT_NAMES: Record<Suit, string> = {
  C: 'Clubs',
  D: 'Diamonds',
  H: 'Hearts',
  S: 'Spades',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  C: '\u2663',
  D: '\u2666',
  H: '\u2665',
  S: '\u2660',
};

export const RANK_NAMES: Record<Rank, string> = {
  A: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
};

export function isRedSuit(suit: Suit): boolean {
  return suit === 'D' || suit === 'H';
}

/** Parse a canonical card code (e.g. "4C", "10H", "AS") into a Card. */
export function parseCard(code: string): Card {
  const normalized = code.trim().toUpperCase();
  const suit = normalized.slice(-1) as Suit;
  const rank = normalized.slice(0, -1) as Rank;
  if (!SUITS.includes(suit) || !RANKS.includes(rank)) {
    throw new Error(`Invalid card code: ${code}`);
  }
  return { code: `${rank}${suit}`, rank, suit };
}

export function makeCard(rank: Rank, suit: Suit): Card {
  return { code: `${rank}${suit}`, rank, suit };
}

export function cardLabel(card: Card): string {
  return `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`;
}

/**
 * Map a card to the component key exported by @letele/playing-cards.
 * That package names components as <SuitLetter><rankToken>, e.g.
 * C4 (4 of clubs), Sa (ace of spades), Hq (queen of hearts), Ck (king of clubs).
 */
export function cardAssetKey(card: Card): string {
  const rankToken =
    card.rank === 'A'
      ? 'a'
      : card.rank === 'J'
        ? 'j'
        : card.rank === 'Q'
          ? 'q'
          : card.rank === 'K'
            ? 'k'
            : card.rank;
  return `${card.suit}${rankToken}`;
}
