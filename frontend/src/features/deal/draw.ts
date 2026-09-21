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

export interface DrawOptions {
  /** Any card may come up, including ones already dealt. The packet is left as-is. */
  repeat?: boolean;
}

/**
 * Deal the next stack position.
 * Without `repeat`, cards come from the shuffled packet with no replacement.
 * An empty packet is replaced with a new shuffle first, and the top card is
 * skipped when it would immediately repeat `avoid`.
 * With `repeat`, every shot is a fresh pick from the whole deck.
 */
export function takeRandomCard(
  packet: number[],
  avoid: number | null,
  options?: DrawOptions,
): Draw {
  if (options?.repeat) {
    const position = shuffledPacket()[0]!;
    return { position, rest: packet, reshuffled: false };
  }

  const reshuffled = packet.length === 0;
  const deck = reshuffled ? shuffledPacket() : packet;
  let index = 0;
  if (avoid != null && deck[0] === avoid && deck.length > 1) index = 1;
  const position = deck[index]!;
  const rest = deck.filter((_, i) => i !== index);
  return { position, rest, reshuffled };
}
