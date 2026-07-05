import { useState } from 'react';
import { repository } from '../../db/repository';
import { TRAINING_MODES, type ScopeType } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { computeChunks, resolveScopePositions } from '../training/engine';

const SESSION_LENGTHS: (number | 'all')[] = ['all', 10, 20, 30, 52];

export function SettingsPage() {
  const { settings, update, loading } = useSettings();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  if (loading) return <div className="empty">Loading…</div>;

  const chunks = computeChunks(settings.scope.chunkSize);
  const scopeCount = resolveScopePositions(settings.scope).length;

  const setScopeType = (type: ScopeType) =>
    update({ scope: { ...settings.scope, type } });

  const toggleChunk = (index: number) => {
    const selected = new Set(settings.scope.selectedChunks);
    if (selected.has(index)) selected.delete(index);
    else selected.add(index);
    update({ scope: { ...settings.scope, selectedChunks: [...selected].sort((a, b) => a - b) } });
  };

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
      <div className="seg">
        {(['all', 'chunks', 'range'] as ScopeType[]).map((t) => (
          <button
            key={t}
            className={settings.scope.type === t ? 'active' : ''}
            onClick={() => setScopeType(t)}
          >
            {t === 'all' ? 'Full deck' : t === 'chunks' ? 'Sections' : 'Range'}
          </button>
        ))}
      </div>

      {settings.scope.type === 'chunks' && (
        <div className="card-panel" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="chunkSize">Section size</label>
            <select
              id="chunkSize"
              value={settings.scope.chunkSize}
              onChange={(e) =>
                update({
                  scope: {
                    ...settings.scope,
                    chunkSize: Number(e.target.value),
                    selectedChunks: [0],
                  },
                })
              }
            >
              {[4, 5, 7, 10, 13, 17, 26].map((n) => (
                <option key={n} value={n}>
                  {n} cards per section
                </option>
              ))}
            </select>
          </div>
          <div className="chunk-grid">
            {chunks.map((c) => (
              <button
                key={c.index}
                className={`chunk-cell ${settings.scope.selectedChunks.includes(c.index) ? 'selected' : ''}`}
                onClick={() => toggleChunk(c.index)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.scope.type === 'range' && (
        <div className="card-panel" style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="rangeStart">From position</label>
              <input
                id="rangeStart"
                type="number"
                min={1}
                max={52}
                value={settings.scope.rangeStart}
                onChange={(e) =>
                  update({ scope: { ...settings.scope, rangeStart: Number(e.target.value) } })
                }
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="rangeEnd">To position</label>
              <input
                id="rangeEnd"
                type="number"
                min={1}
                max={52}
                value={settings.scope.rangeEnd}
                onChange={(e) =>
                  update({ scope: { ...settings.scope, rangeEnd: Number(e.target.value) } })
                }
              />
            </div>
          </div>
        </div>
      )}

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
