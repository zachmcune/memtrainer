import { useState } from 'react';
import { ScopeControls } from '../../components/ScopeControls';
import { repository } from '../../db/repository';
import { TRAINING_MODES } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { resolveScopePositions } from '../training/engine';

const SESSION_LENGTHS: (number | 'all')[] = ['all', 10, 20, 30, 52];

export function SettingsPage() {
  const { settings, update, loading } = useSettings();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  if (loading) return <div className="empty">Loading…</div>;

  const scopeCount = resolveScopePositions(settings.scope).length;

  async function handleReset() {
    if (confirm('Erase all sessions and card stats? This cannot be undone.')) {
      await repository.clearAll();
      setResetMsg('Stats cleared.');
    }
  }

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
            When you miss, show four consecutive stack cards around the answer (e.g. #1–#4 for
            2♥).
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
