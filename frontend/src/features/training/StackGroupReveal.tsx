import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel, type Card } from '../../data/deck';
import { cardAtPosition, stackGroupPositions } from '../../data/mnemonica';

interface StackGroupRevealProps {
  position: number;
  card: Card;
}

/**
 * On a miss, shows the fixed group of four stack cards the quizzed position
 * belongs to — e.g. positions 1–4: 4C, 2H, 7D, 3C.
 */
export function StackGroupReveal({ position, card }: StackGroupRevealProps) {
  const positions = stackGroupPositions(position);

  return (
    <div className="stack-group">
      {positions.map((pos) => {
        const slotCard = pos === position ? card : cardAtPosition(pos);
        const isCenter = pos === position;
        return (
          <div
            key={pos}
            className={`stack-group-slot${isCenter ? ' stack-group-slot-center' : ''}`}
          >
            <PlayingCard card={slotCard} width={isCenter ? 62 : 52} />
            <span className="stack-group-pos">#{pos}</span>
            {isCenter ? (
              <span className="stack-group-name">{cardLabel(card)}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
