import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel, parseCard } from '../../data/deck';
import type { AttemptResult } from '../../db/types';
import { accuracyColor, formatMs, summarizeSession } from './compute';

export function SessionSummary({ results }: { results: AttemptResult[] }) {
  const s = summarizeSession(results);
  const pct = Math.round(s.accuracy * 100);

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value" style={{ color: accuracyColor(s.accuracy) }}>
            {pct}%
          </div>
          <div className="label">
            Accuracy ({s.correct}/{s.total})
          </div>
        </div>
        <div className="stat-tile">
          <div className="value">{formatMs(s.avgTimeMs)}</div>
          <div className="label">Avg response</div>
        </div>
        <div className="stat-tile">
          <div className="value">{formatMs(s.fastestMs)}</div>
          <div className="label">Fastest</div>
        </div>
        <div className="stat-tile">
          <div className="value">{formatMs(s.slowestMs)}</div>
          <div className="label">Slowest</div>
        </div>
      </div>

      {s.perChunk.length > 1 && (
        <>
          <h2>Accuracy by section</h2>
          <div className="card-panel">
            {s.perChunk.map((c) => (
              <div className="bar-row" key={c.label}>
                <span className="bar-label">{c.label}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{
                      width: `${Math.round(c.accuracy * 100)}%`,
                      background: accuracyColor(c.accuracy),
                    }}
                  />
                </span>
                <span className="bar-value">{Math.round(c.accuracy * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Cards to review ({s.missed.length})</h2>
      {s.missed.length === 0 ? (
        <div className="card-panel center muted">Flawless — no misses this session.</div>
      ) : (
        <div className="miss-list">
          {s.missed.map((m) => {
            const card = parseCard(m.code);
            return (
              <div className="miss-item" key={m.code}>
                <PlayingCard card={card} width={44} />
                <div className="meta">
                  <div className="title">
                    #{m.position} · {cardLabel(card)}
                  </div>
                  <div className="sub">
                    You answered:{' '}
                    {m.userAnswer === '—' ? "I don't know" : m.userAnswer || '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
