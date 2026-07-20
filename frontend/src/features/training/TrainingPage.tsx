import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { QUEUE_STRATEGIES, TRAINING_MODES } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { useTrainingSession } from '../../state/TrainingSessionContext';
import { SessionSummary } from '../stats/SessionSummary';
import { buildSessionQueue, countDueInScope, resolveScopePositions } from './engine';
import { buildInitialRunnerState, TrainingRunner } from './TrainingRunner';
import { useSound } from '../../audio/useSound';

export function TrainingPage() {
  const { settings, loading } = useSettings();
  const navigate = useNavigate();
  const play = useSound();
  const { phase, finished, startSession } = useTrainingSession();
  const cardStats = useLiveQuery(() => db.cardStats.toArray(), [], undefined);

  const scopePositions = useMemo(
    () => resolveScopePositions(settings.scope),
    [settings.scope],
  );

  const dueCounts = useMemo(() => {
    if (cardStats === undefined) return null;
    return countDueInScope(scopePositions, cardStats, settings.mode);
  }, [cardStats, scopePositions, settings.mode]);

  const previewQueue = useMemo(() => {
    if (cardStats === undefined) return null;
    return buildSessionQueue(
      scopePositions,
      settings.sessionLength,
      settings.queueStrategy,
      cardStats,
      settings.mode,
    );
  }, [cardStats, scopePositions, settings]);

  const beginSession = useCallback(() => {
    if (!previewQueue || previewQueue.length === 0) return;
    play('deal');
    startSession(
      buildInitialRunnerState(
        previewQueue,
        settings.mode,
        scopePositions,
        settings.flashPrompt,
      ),
    );
  }, [previewQueue, scopePositions, settings.mode, settings.flashPrompt, startSession, play]);

  if (loading) {
    return <div className="empty">Loading…</div>;
  }

  if (phase === 'running') {
    return <TrainingRunner />;
  }

  if (phase === 'finished' && finished) {
    const canTrainAgain = Boolean(previewQueue && previewQueue.length > 0);

    return (
      <div>
        <h1>Session complete</h1>
        <p className="subtitle">Nice work. Here is how you did.</p>
        <SessionSummary results={finished.results} />
        <div className="row" style={{ marginTop: 18 }}>
          <button
            className="btn primary block"
            onClick={beginSession}
            disabled={!canTrainAgain}
          >
            {canTrainAgain ? 'Train again' : 'Nothing due'}
          </button>
          <button className="btn block" onClick={() => navigate('/stats')}>
            All stats
          </button>
        </div>
      </div>
    );
  }

  const modeInfo = TRAINING_MODES.find((m) => m.value === settings.mode)!;
  const queueInfo = QUEUE_STRATEGIES.find((s) => s.value === settings.queueStrategy)!;
  const statsReady = cardStats !== undefined;
  const isSpaced = settings.queueStrategy === 'spaced';
  const nothingToTrain = statsReady && previewQueue !== null && previewQueue.length === 0;
  const sessionLengthLabel =
    settings.sessionLength === 'all'
      ? isSpaced
        ? 'All due'
        : 'Whole scope'
      : `${settings.sessionLength} prompts`;

  return (
    <div>
      <h1>Train</h1>
      <p className="subtitle">{modeInfo.help}</p>
      <div className="card-panel">
        <div className="row spread">
          <span className="muted">Mode</span>
          <span className="pill">{modeInfo.label}</span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">Queue</span>
          <span className="pill">{queueInfo.label}</span>
        </div>
        {dueCounts && (
          <div className="row spread" style={{ marginTop: 10 }}>
            <span className="muted">Due now</span>
            <span className="pill">{dueCounts.due}</span>
          </div>
        )}
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">In scope</span>
          <span className="pill">{scopePositions.length} cards</span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">Session length</span>
          <span className="pill">{sessionLengthLabel}</span>
        </div>
        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">Re-drill misses</span>
          <span className="pill">{settings.redrillMissed ? 'On' : 'Off'}</span>
        </div>
      </div>
      {scopePositions.length === 0 ? (
        <div className="banner warn">
          No cards are selected. Choose at least one section in Settings.
        </div>
      ) : nothingToTrain ? (
        <div className="banner">
          Nothing is due right now. Come back later, widen your study scope, or switch Queue to
          Random / Dynamic for extra practice.
        </div>
      ) : (
        <button className="btn primary block" onClick={beginSession} disabled={!statsReady}>
          {statsReady ? 'Start session' : 'Loading stats…'}
        </button>
      )}
      <button
        className="btn ghost block"
        style={{ marginTop: 10 }}
        onClick={() => navigate('/settings')}
      >
        Adjust settings
      </button>
    </div>
  );
}
