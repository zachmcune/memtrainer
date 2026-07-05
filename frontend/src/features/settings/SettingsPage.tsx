import { useState } from 'react';
import { repository } from '../../db/repository';
import { browserTimezone } from '../../db/defaults';
import { TRAINING_MODES, type ScopeType } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { computeChunks, resolveScopePositions } from '../training/engine';
import {
  disableReminders,
  enableReminders,
  isIos,
  isPushSupported,
  isStandalone,
  sendTestNotification,
  updateReminders,
} from '../../pwa/push';

const SESSION_LENGTHS: (number | 'all')[] = ['all', 10, 20, 30, 52];

export function SettingsPage() {
  const { settings, update, loading } = useSettings();
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);
  const [reminderErr, setReminderErr] = useState<string | null>(null);

  if (loading) return <div className="empty">Loading…</div>;

  const chunks = computeChunks(settings.scope.chunkSize);
  const scopeCount = resolveScopePositions(settings.scope).length;
  const pushSupported = isPushSupported();

  const setScopeType = (type: ScopeType) =>
    update({ scope: { ...settings.scope, type } });

  const toggleChunk = (index: number) => {
    const selected = new Set(settings.scope.selectedChunks);
    if (selected.has(index)) selected.delete(index);
    else selected.add(index);
    update({ scope: { ...settings.scope, selectedChunks: [...selected].sort((a, b) => a - b) } });
  };

  async function handleToggleReminders(next: boolean) {
    setReminderErr(null);
    setReminderMsg(null);
    setReminderBusy(true);
    try {
      const tz = browserTimezone();
      if (next) {
        const endpoint = await enableReminders({
          reminderTime: settings.reminderTime,
          timezone: tz,
          enabled: true,
        });
        await update({ reminderEnabled: true, timezone: tz, pushEndpoint: endpoint });
        setReminderMsg(`Daily reminder set for ${settings.reminderTime}.`);
      } else {
        if (settings.pushEndpoint) await disableReminders(settings.pushEndpoint);
        await update({ reminderEnabled: false, pushEndpoint: undefined });
        setReminderMsg('Reminders turned off.');
      }
    } catch (e) {
      setReminderErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setReminderBusy(false);
    }
  }

  async function handleTimeChange(time: string) {
    await update({ reminderTime: time });
    if (settings.reminderEnabled && settings.pushEndpoint) {
      try {
        await updateReminders(settings.pushEndpoint, {
          reminderTime: time,
          timezone: browserTimezone(),
          enabled: true,
        });
        setReminderMsg(`Daily reminder updated to ${time}.`);
      } catch (e) {
        setReminderErr(e instanceof Error ? e.message : 'Could not update time.');
      }
    }
  }

  async function handleReset() {
    if (confirm('Erase all sessions and card stats? This cannot be undone.')) {
      await repository.clearAll();
      setReminderMsg('Stats cleared.');
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

      <h2>Daily reminder</h2>
      {!pushSupported ? (
        <div className="banner">
          This browser doesn&apos;t support push notifications. Reminders are available in
          Chrome, Firefox, Edge, and Safari (iOS 16.4+ after adding to your Home Screen).
        </div>
      ) : (
        <>
          {isIos() && !isStandalone() && (
            <div className="banner warn">
              To receive reminders on iPhone/iPad: tap the Share icon in Safari, choose
              &ldquo;Add to Home Screen&rdquo;, then open the app from that icon and enable
              reminders here.
            </div>
          )}
          <div className="toggle-row">
            <div>
              <div>Remind me to practice</div>
              <div className="muted">A daily push notification at your chosen time.</div>
            </div>
            <Switch
              checked={settings.reminderEnabled}
              disabled={reminderBusy}
              onChange={handleToggleReminders}
            />
          </div>
          <div className="field">
            <label htmlFor="reminderTime">Reminder time</label>
            <input
              id="reminderTime"
              type="time"
              value={settings.reminderTime}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>
          {settings.reminderEnabled && (
            <button
              className="btn ghost block"
              onClick={() => sendTestNotification().catch(() => undefined)}
            >
              Send a test notification
            </button>
          )}
          {reminderMsg && (
            <div className="feedback good" style={{ marginTop: 10 }}>
              {reminderMsg}
            </div>
          )}
          {reminderErr && (
            <div className="feedback bad" style={{ marginTop: 10 }}>
              {reminderErr}
            </div>
          )}
        </>
      )}

      <h2>Data</h2>
      <button className="btn danger block" onClick={handleReset}>
        Reset all stats
      </button>
      <p className="muted center" style={{ marginTop: 24 }}>
        Mnemonica Trainer · your progress is stored on this device.
      </p>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="track" />
    </label>
  );
}
