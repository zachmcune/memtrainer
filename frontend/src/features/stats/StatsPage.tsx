import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { TRAINING_MODES } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { accuracyColor, rankCardStats, summarizeHistory } from './compute';
import { CardLeaderboard } from './CardLeaderboard';

export function StatsPage() {
  const { settings } = useSettings();
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
  const modeInfo = TRAINING_MODES.find((m) => m.value === settings.mode)!;
  const ranked = rankCardStats(cardStats, settings.mode);

  return (
    <div>
      <h1>Stats</h1>
      <p className="subtitle">See your strongest cards and where to focus next.</p>

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

      <h2>Card leaderboard</h2>
      <p className="muted" style={{ marginTop: -4, marginBottom: 10 }}>
        {modeInfo.label} · best to worst · {ranked.length} card{ranked.length === 1 ? '' : 's'}
      </p>
      <CardLeaderboard cards={ranked} />
    </div>
  );
}
