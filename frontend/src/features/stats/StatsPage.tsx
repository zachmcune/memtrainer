import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { PlayingCard } from '../../components/PlayingCard';
import { cardLabel, parseCard } from '../../data/deck';
import { TRAINING_MODES } from '../../db/types';
import { accuracyColor, formatMs, summarizeHistory } from './compute';

export function StatsPage() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], undefined);
  const cardStats = useLiveQuery(() => db.cardStats.toArray(), [], undefined);

  if (sessions === undefined || cardStats === undefined) {
    return <div className="empty">Loading…</div>;
  }

  if (sessions.length === 0) {
    return (
      <div>
        <h1>Stats</h1>
        <div className="empty">
          No sessions yet. Finish a training session to unlock your stats.
        </div>
      </div>
    );
  }

  const h = summarizeHistory(sessions, cardStats);
  const trend = h.trend.slice(-20);
  const maxTrend = Math.max(...trend.map((t) => t.accuracy), 0.01);

  return (
    <div>
      <h1>Stats</h1>
      <p className="subtitle">Spot the cards costing you the most.</p>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value">{h.streakDays}🔥</div>
          <div className="label">Day streak</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: accuracyColor(h.overallAccuracy) }}>
            {Math.round(h.overallAccuracy * 100)}%
          </div>
          <div className="label">Lifetime accuracy</div>
        </div>
        <div className="stat-tile">
          <div className="value">{h.totalSessions}</div>
          <div className="label">Sessions</div>
        </div>
        <div className="stat-tile">
          <div className="value">{h.totalAttempts}</div>
          <div className="label">Cards drilled</div>
        </div>
      </div>

      {trend.length > 1 && (
        <>
          <h2>Accuracy trend</h2>
          <div className="card-panel">
            <div className="trend">
              {trend.map((t, i) => (
                <div
                  key={i}
                  className="col"
                  style={{
                    height: `${Math.max(6, (t.accuracy / maxTrend) * 100)}%`,
                    background: accuracyColor(t.accuracy),
                  }}
                  title={`${Math.round(t.accuracy * 100)}%`}
                />
              ))}
            </div>
            <p className="muted center" style={{ marginTop: 8 }}>
              Last {trend.length} sessions (oldest → newest)
            </p>
          </div>
        </>
      )}

      <h2>Cards to focus on</h2>
      {h.weakest.length === 0 ? (
        <div className="card-panel center muted">Not enough data yet.</div>
      ) : (
        <div className="miss-list">
          {h.weakest.map((w) => {
            const card = parseCard(w.code);
            const modeLabel = TRAINING_MODES.find((m) => m.value === w.mode)?.label ?? w.mode;
            return (
              <div className="miss-item" key={w.mode + w.code}>
                <PlayingCard card={card} width={44} />
                <div className="meta">
                  <div className="title">
                    #{w.position} · {cardLabel(card)}
                  </div>
                  <div className="sub">
                    {modeLabel} · {w.correct}/{w.attempts} right · avg {formatMs(w.avgTimeMs)}
                  </div>
                </div>
                <div
                  style={{ fontWeight: 800, color: accuracyColor(w.accuracy) }}
                >
                  {Math.round(w.accuracy * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
