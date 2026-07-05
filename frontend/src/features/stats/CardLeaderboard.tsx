import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel, parseCard } from '../../data/deck';
import { accuracyColor } from './compute';
import type { RankedCard } from './compute';

export function CardLeaderboard({ cards }: { cards: RankedCard[] }) {
  if (cards.length === 0) {
    return <div className="card-panel center muted">No card data for this mode yet.</div>;
  }

  return (
    <div className="card-leaderboard">
      {cards.map((card, index) => {
        const parsed = parseCard(card.code);
        const rank = index + 1;
        const isWeak = rank > cards.length - 3 && cards.length >= 6;

        return (
          <div
            className={`leaderboard-row${isWeak ? ' weak' : ''}`}
            key={card.code}
            title={`${card.correct}/${card.attempts} correct`}
          >
            <span className="leaderboard-rank">{rank}</span>
            <PlayingCard card={parsed} width={34} />
            <div className="leaderboard-meta">
              <span className="leaderboard-name">#{card.position} · {cardLabel(parsed)}</span>
              <div className="bar-track compact">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.round(card.accuracy * 100)}%`,
                    background: accuracyColor(card.accuracy),
                  }}
                />
              </div>
            </div>
            <span
              className="leaderboard-acc"
              style={{ color: accuracyColor(card.accuracy) }}
            >
              {Math.round(card.accuracy * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
