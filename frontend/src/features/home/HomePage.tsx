import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { TRAINING_MODES } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { resolveScopePositions } from '../training/engine';
import { accuracyColor, computeStreak, summarizeHistory } from '../stats/compute';
import { isIos, isStandalone } from '../../pwa/push';

export function HomePage() {
  const { settings } = useSettings();
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], undefined);
  const cardStats = useLiveQuery(() => db.cardStats.toArray(), [], undefined);

  const scopeCount = resolveScopePositions(settings.scope).length;
  const modeInfo = TRAINING_MODES.find((m) => m.value === settings.mode)!;
  const streak = sessions ? computeStreak(sessions) : 0;
  const history =
    sessions && cardStats ? summarizeHistory(sessions, cardStats) : null;

  const showInstallHint = isIos() && !isStandalone();

  return (
    <div>
      <h1>Mnemonica Trainer</h1>
      <p className="subtitle">Master the stack, one card at a time.</p>

      {showInstallHint && (
        <div className="banner">
          Install the app: tap the Share icon, then &ldquo;Add to Home Screen&rdquo; to run
          it full screen and enable daily reminders.
        </div>
      )}

      <div className="card-panel">
        <div className="row spread">
          <div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{streak}🔥</div>
            <div className="muted">day streak</div>
          </div>
          {history && history.totalSessions > 0 && (
            <div className="center">
              <div
                style={{ fontSize: 30, fontWeight: 800, color: accuracyColor(history.overallAccuracy) }}
              >
                {Math.round(history.overallAccuracy * 100)}%
              </div>
              <div className="muted">lifetime accuracy</div>
            </div>
          )}
        </div>
      </div>

      <Link to="/train" className="btn primary block" style={{ marginTop: 6 }}>
        Start training
      </Link>

      <div className="card-panel" style={{ marginTop: 14 }}>
        <div className="row spread">
          <span className="muted">Today&apos;s drill</span>
          <span className="pill">{modeInfo.label}</span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">Scope</span>
          <span className="pill">{scopeCount} cards</span>
        </div>
        <Link to="/settings" className="btn ghost block" style={{ marginTop: 14 }}>
          Change what you study
        </Link>
      </div>

      <div className="row" style={{ marginTop: 6 }}>
        <Link to="/stats" className="btn block">
          View stats
        </Link>
      </div>
    </div>
  );
}
