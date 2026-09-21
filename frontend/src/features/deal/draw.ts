import { DECK_SIZE } from '../../data/mnemonica';
import { shuffle } from '../training/engine';

export function fullPacket(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
}

/** A fresh shuffled packet of stack positions, 1–52. */
export function shuffledPacket(): number[] {
  return shuffle(fullPacket());
}

export interface Draw {
  position: number;
  rest: number[];
  /** True when the packet was empty and a new shuffle was cut. */
  reshuffled: boolean;
}

/**
 * Deal the next position from a shuffled packet, without replacement.
 * An empty packet is replaced with a new shuffle first.
 * When the top card would repeat `avoid` and another card is available, the
 * next card is dealt instead so a reshuffle doesn't hand back the same card.
 */
export function takeRandomCard(packet: number[], avoid: number | null): Draw {
  const reshuffled = packet.length === 0;
  const deck = reshuffled ? shuffledPacket() : packet;
  let index = 0;
  if (avoid != null && deck[0] === avoid && deck.length > 1) index = 1;
  const position = deck[index]!;
  const rest = deck.filter((_, i) => i !== index);
  return { position, rest, reshuffled };
}
