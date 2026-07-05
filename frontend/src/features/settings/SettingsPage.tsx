import { useState } from 'react';
import { ScopeControls } from '../../components/ScopeControls';
import { repository } from '../../db/repository';
import { QUEUE_STRATEGIES, TRAINING_MODES } from '../../db/types';
import { usePwaUpdate } from '../../pwa/UpdateContext';
import { useSettings } from '../../state/SettingsContext';
import { formatBuildDate, formatVersion } from '../../version';
import { resolveScopePositions } from '../training/engine';

const SESSION_LENGTHS: (number | 'all')[] = ['all', 10, 20, 30, 52];

export function SettingsPage() {
  const { settings, update, loading } = useSettings();
  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    isUpToDate,
    checking,
    applyUpdate,
    checkForUpdates,
  } = usePwaUpdate();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  if (loading) return <div className="empty">Loading…</div>;

  const scopeCount = resolveScopePositions(settings.scope).length;

  async function handleReset() {
    if (confirm('Erase all sessions and card stats? This cannot be undone.')) {
      await repository.clearAll();
      setResetMsg('Stats cleared.');
    }
  }

  const statusLabel = updateAvailable
    ? 'Update available'
    : isUpToDate
      ? 'Up to date'
      : checking
        ? 'Checking…'
        : 'Unknown';

  return (
    <div>
      <h1>Settings</h1>
      <p className="subtitle">Tune how you drill the stack.</p>

      <h2>Mode</h2>
      <div className="seg" role="tablist">
        {TRAINING_MODES.map((m) => (
          <button
            key={m.value}
            className={settings.mode === m.value ? 'active' : ''}
            onClick={() => update({ mode: m.value })}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        {TRAINING_MODES.find((m) => m.value === settings.mode)!.help}
      </p>

      <h2>Queue</h2>
      <div className="seg" role="tablist">
        {QUEUE_STRATEGIES.map((s) => (
          <button
            key={s.value}
            className={settings.queueStrategy === s.value ? 'active' : ''}
            onClick={() => update({ queueStrategy: s.value })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        {QUEUE_STRATEGIES.find((s) => s.value === settings.queueStrategy)!.help}
      </p>

      <h2>Study scope</h2>
      <ScopeControls
        scope={settings.scope}
        onChange={(scope) => update({ scope })}
        idPrefix="train-"
      />
      <p className="muted" style={{ marginTop: 8 }}>
        {scopeCount} card{scopeCount === 1 ? '' : 's'} currently in scope.
      </p>

      <h2>Session</h2>
      <div className="field">
        <label htmlFor="sessionLength">Prompts per session</label>
        <select
          id="sessionLength"
          value={String(settings.sessionLength)}
          onChange={(e) =>
            update({
              sessionLength: e.target.value === 'all' ? 'all' : Number(e.target.value),
            })
          }
        >
          {SESSION_LENGTHS.map((n) => (
            <option key={String(n)} value={String(n)}>
              {n === 'all' ? 'Whole scope (once)' : `${n} prompts`}
            </option>
          ))}
        </select>
      </div>
      <div className="toggle-row">
        <div>
          <div>Re-drill missed cards</div>
          <div className="muted">Replay the cards you missed at the end of each session.</div>
        </div>
        <Switch
          checked={settings.redrillMissed}
          onChange={(v) => update({ redrillMissed: v })}
        />
      </div>
      <div className="toggle-row">
        <div>
          <div>Show stack neighbors on miss</div>
          <div className="muted">
            When you miss, show the card before and after in the stack flanking the answer.
          </div>
        </div>
        <Switch
          checked={settings.showStackNeighborsOnMiss}
          onChange={(v) => update({ showStackNeighborsOnMiss: v })}
        />
      </div>
      <div className="toggle-row">
        <div>
          <div>Show stack group of four on miss</div>
          <div className="muted">
            When you miss, show the group of four the answer belongs to (e.g. #1–#4 for positions
            1–4, #5–#8 for positions 5–8).
          </div>
        </div>
        <Switch
          checked={settings.showStackGroupOnMiss}
          onChange={(v) => update({ showStackGroupOnMiss: v })}
        />
      </div>

      <h2>Data</h2>
      <button className="btn danger block" onClick={handleReset}>
        Reset all stats
      </button>
      {resetMsg && (
        <div className="feedback good" style={{ marginTop: 10 }}>
          {resetMsg}
        </div>
      )}

      <h2>About</h2>
      <div className="card-panel version-panel">
        <div className="version-row">
          <span className="muted">Installed</span>
          <span>{formatVersion(currentVersion)}</span>
        </div>
        <div className="version-row">
          <span className="muted">Built</span>
          <span>{formatBuildDate(currentVersion.builtAt)}</span>
        </div>
        {latestVersion && (
          <div className="version-row">
            <span className="muted">Latest online</span>
            <span>{formatVersion(latestVersion)}</span>
          </div>
        )}
        <div className="version-row">
          <span className="muted">Status</span>
          <span className={updateAvailable ? 'version-status-warn' : undefined}>{statusLabel}</span>
        </div>
        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          <button className="btn block" onClick={() => void checkForUpdates()} disabled={checking}>
            {checking ? 'Checking…' : 'Check for updates'}
          </button>
          {updateAvailable && (
            <button className="btn primary block" onClick={applyUpdate}>
              Update now
            </button>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5 }}>
          Still on an old build?{' '}
          <a href={`${import.meta.env.BASE_URL}reset.html`}>Tap here to refresh the app</a>
          . Your stats stay on this device.
        </p>
      </div>

      <p className="muted center" style={{ marginTop: 24 }}>
        Mnemonica Trainer · your progress is stored on this device.
      </p>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="track" />
    </label>
  );
}
