import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel, type Card } from '../../data/deck';
import { DECK_SIZE, cardAtPosition } from '../../data/mnemonica';

interface StackNeighborRevealProps {
  position: number;
  card: Card;
}

/**
 * On a miss, shows the quizzed card in the center with the stack neighbors
 * immediately before (left) and after (right) in Mnemonica order.
 */
export function StackNeighborReveal({ position, card }: StackNeighborRevealProps) {
  const before = position > 1 ? cardAtPosition(position - 1) : null;
  const after = position < DECK_SIZE ? cardAtPosition(position + 1) : null;

  return (
    <div className="stack-neighbors">
      <div className="stack-neighbor">
        {before ? (
          <>
            <PlayingCard card={before} width={58} />
            <span className="stack-neighbor-pos">#{position - 1}</span>
          </>
        ) : (
          <div className="stack-neighbor-empty" aria-hidden />
        )}
      </div>
      <div className="stack-neighbor stack-neighbor-center">
        <PlayingCard card={card} width={88} />
        <span className="stack-neighbor-pos">#{position}</span>
        <span className="stack-neighbor-name">{cardLabel(card)}</span>
      </div>
      <div className="stack-neighbor">
        {after ? (
          <>
            <PlayingCard card={after} width={58} />
            <span className="stack-neighbor-pos">#{position + 1}</span>
          </>
        ) : (
          <div className="stack-neighbor-empty" aria-hidden />
        )}
      </div>
    </div>
  );
}
