import { DECK_SIZE } from './mnemonica';

export interface Chunk {
  index: number;
  start: number;
  end: number;
  label: string;
}

/** Split the deck into chunks of `chunkSize` (last chunk may be smaller). */
export function computeChunks(chunkSize: number): Chunk[] {
  const size = Math.max(1, Math.min(DECK_SIZE, Math.floor(chunkSize) || 1));
  const chunks: Chunk[] = [];
  let index = 0;
  for (let start = 1; start <= DECK_SIZE; start += size) {
    const end = Math.min(start + size - 1, DECK_SIZE);
    chunks.push({ index, start, end, label: `${start}\u2013${end}` });
    index += 1;
  }
  return chunks;
}
