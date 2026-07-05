import { RANKS, SUITS, SUIT_SYMBOLS, isRedSuit, type Rank, type Suit } from '../../data/deck';

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
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" onClick={onBackspace} aria-label="Delete">
        {'\u232B'}
      </button>
      <button type="button" onClick={() => onDigit('0')}>
        0
      </button>
      <button
        type="button"
        className="primary"
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ background: canSubmit ? 'var(--accent-strong)' : undefined }}
      >
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', alignItems: 'center' }}>
      <div className="rank-grid">
        {RANKS.map((r) => (
          <button
            key={r}
            type="button"
            className={rank === r ? 'chosen' : ''}
            onClick={() => onRank(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="suit-grid">
        {SUITS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${suit === s ? 'chosen' : ''} ${isRedSuit(s) ? 'suit-red' : 'suit-black'}`}
            onClick={() => onSuit(s)}
            aria-label={s}
          >
            {SUIT_SYMBOLS[s]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn primary block"
        style={{ maxWidth: 360 }}
        disabled={!rank || !suit}
        onClick={onSubmit}
      >
        Submit
      </button>
    </div>
  );
}
