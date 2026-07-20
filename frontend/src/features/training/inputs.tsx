import { RANKS, SUITS, SUIT_SYMBOLS, isRedSuit, type Rank, type Suit } from '../../data/deck';
import { useSound } from '../../audio/useSound';

const NUMBER_RANKS = RANKS.filter((r) => r !== 'J' && r !== 'Q' && r !== 'K');
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

export function NumberPad({
  onDigit,
  onBackspace,
  onSubmit,
  canSubmit,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const play = useSound();
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => {
            play('key');
            onDigit(d);
          }}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          play('key');
          onBackspace();
        }}
        aria-label="Delete"
      >
        {'\u232B'}
      </button>
      <button
        type="button"
        onClick={() => {
          play('key');
          onDigit('0');
        }}
      >
        0
      </button>
      <button type="button" className="primary" onClick={onSubmit} disabled={!canSubmit}>
        {'\u23CE'}
      </button>
    </div>
  );
}

export function CardPicker({
  rank,
  suit,
  onRank,
  onSuit,
  onSubmit,
}: {
  rank: Rank | null;
  suit: Suit | null;
  onRank: (r: Rank) => void;
  onSuit: (s: Suit) => void;
  onSubmit: () => void;
}) {
  const play = useSound();
  const ready = Boolean(rank && suit);
  const suitClass = suit ? (isRedSuit(suit) ? 'suit-red' : 'suit-black') : '';

  return (
    <div className="picker">
      <div className="picker-preview" aria-live="polite">
        <span className={`picker-preview-rank${rank ? '' : ' placeholder'}`}>
          {rank ?? '?'}
        </span>
        <span className={`picker-preview-suit ${suitClass}${suit ? '' : ' placeholder'}`}>
          {suit ? SUIT_SYMBOLS[suit] : '?'}
        </span>
      </div>

      <div className="picker-section">
        <span className="picker-label">Suit</span>
        <div className="suit-grid suit-grid-large">
          {SUITS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${suit === s ? 'chosen' : ''} ${isRedSuit(s) ? 'suit-red' : 'suit-black'}`}
              onClick={() => {
                play('key');
                onSuit(s);
              }}
              aria-label={s}
            >
              {SUIT_SYMBOLS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-section">
        <span className="picker-label">Rank</span>
        <div className="rank-grid rank-grid-numbers">
          {NUMBER_RANKS.map((r) => (
            <button
              key={r}
              type="button"
              className={rank === r ? 'chosen' : ''}
              onClick={() => {
                play('key');
                onRank(r);
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="rank-grid rank-grid-faces">
          {FACE_RANKS.map((r) => (
            <button
              key={r}
              type="button"
              className={rank === r ? 'chosen' : ''}
              onClick={() => {
                play('key');
                onRank(r);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn primary block picker-submit"
        disabled={!ready}
        onClick={onSubmit}
      >
        {ready ? 'Submit' : 'Pick a suit & rank'}
      </button>
    </div>
  );
}
