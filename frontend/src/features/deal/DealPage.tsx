import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardBack, PlayingCard } from '../../components/PlayingCard';
import { CollapsibleScopePanel } from '../../components/CollapsibleScopePanel';
import { cardLabel } from '../../data/deck';
import { cardAtPosition } from '../../data/mnemonica';
import type { DealMode } from '../../db/types';
import { useSettings } from '../../state/SettingsContext';
import { resolveScopePositions } from '../training/engine';
import { useSound } from '../../audio/useSound';
import { createDealDraw, DEAL_MODES, type DealDraw } from './deal';

const HISTORY_LIMIT = 8;

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const play = useSound();
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          play('toggle');
          onChange(e.target.checked);
        }}
      />
      <span className="track" />
    </label>
  );
}

export function DealPage() {
  const { settings, update, loading } = useSettings();
  const play = useSound();

  const positions = useMemo(
    () => resolveScopePositions(settings.generatorScope),
    [settings.generatorScope],
  );

  const [pile, setPile] = useState<number[]>([]);
  const [draw, setDraw] = useState<DealDraw | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<DealDraw[]>([]);
  const [dealKey, setDealKey] = useState(0);
  const [reshuffled, setReshuffled] = useState(false);
  const skipHistoryRef = useRef(true);

  const dealNext = useCallback(
    (opts?: { resetShoe?: boolean; recordHistory?: boolean }) => {
      if (positions.length === 0) {
        setDraw(null);
        setPile([]);
        setRevealed(false);
        return;
      }
      const current = skipHistoryRef.current ? null : draw;
      const result = createDealDraw(
        settings.generatorMode,
        opts?.resetShoe ? [] : pile,
        positions,
        settings.generatorNoRepeats,
      );
      if (!result) {
        setDraw(null);
        setPile([]);
        return;
      }
      if (opts?.recordHistory !== false && current) {
        setHistory((prev) => [current, ...prev].slice(0, HISTORY_LIMIT));
      }
      setPile(result.pile);
      setDraw(result.draw);
      setRevealed(false);
      setDealKey((k) => k + 1);
      setReshuffled(Boolean(opts?.resetShoe || (result.reshuffled && current)));
      skipHistoryRef.current = false;
      play('deal');
    },
    [draw, pile, positions, settings.generatorMode, settings.generatorNoRepeats, play],
  );

  useEffect(() => {
    skipHistoryRef.current = true;
    setHistory([]);
    if (positions.length === 0) {
      setDraw(null);
      setPile([]);
      setRevealed(false);
      setReshuffled(false);
      return;
    }
    const result = createDealDraw(settings.generatorMode, [], positions, settings.generatorNoRepeats);
    if (!result) {
      setDraw(null);
      setPile([]);
      return;
    }
    setPile(result.pile);
    setDraw(result.draw);
    setRevealed(false);
    setDealKey((k) => k + 1);
    setReshuffled(false);
    skipHistoryRef.current = false;
    // Fresh shoe when the generator configuration changes — not on every deal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, settings.generatorMode, settings.generatorNoRepeats]);

  const toggleReveal = useCallback(() => {
    setRevealed((prev) => {
      if (!prev) play('tap');
      return !prev;
    });
  }, [play]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === 'BUTTON' ||
          tag === 'INPUT' ||
          tag === 'SELECT' ||
          tag === 'TEXTAREA' ||
          tag === 'SUMMARY' ||
          e.target.isContentEditable
        ) {
          return;
        }
      }
      if (e.key === ' ' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        dealNext();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
        e.preventDefault();
        toggleReveal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dealNext, toggleReveal]);

  if (loading) return <div className="empty">Loading…</div>;

  const modeInfo = DEAL_MODES.find((m) => m.value === settings.generatorMode)!;
  const card = draw ? cardAtPosition(draw.cardPosition) : null;
  const numberCard = draw ? cardAtPosition(draw.numberPosition) : null;
  const remaining = settings.generatorNoRepeats ? pile.length : null;
  const dealtCount = settings.generatorNoRepeats
    ? positions.length - pile.length
    : null;
  const miracle = Boolean(
    draw &&
      settings.generatorMode === 'both' &&
      draw.cardPosition === draw.numberPosition,
  );

  const setMode = (mode: DealMode) => {
    if (mode === settings.generatorMode) return;
    play('toggle');
    void update({ generatorMode: mode });
  };

  return (
    <div className="deal-page">
      <h1>Deal</h1>
      <p className="subtitle">Random cards and numbers for trick rehearsal.</p>

      <div className="seg" role="tablist" aria-label="Deal mode">
        {DEAL_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className={settings.generatorMode === m.value ? 'active' : ''}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        {modeInfo.help}
      </p>

      <CollapsibleScopePanel
        scope={settings.generatorScope}
        onChange={(generatorScope) => update({ generatorScope })}
        idPrefix="deal-"
        defaultCollapsed
      />

      <div className="toggle-row deal-unique-row">
        <div>
          <div>No repeats</div>
          <div className="muted">
            Work through a shuffled shoe. Reshuffles only after every in-scope card is dealt.
          </div>
        </div>
        <Switch
          checked={settings.generatorNoRepeats}
          onChange={(v) => update({ generatorNoRepeats: v })}
        />
      </div>

      {positions.length === 0 ? (
        <div className="card-panel center muted deal-empty">
          No cards selected. Expand &ldquo;Cards to show&rdquo; above and pick a section.
        </div>
      ) : (
        <>
          <div className="deal-meta">
            {remaining !== null && dealtCount !== null ? (
              <span className="pill">
                {dealtCount} / {positions.length} dealt · {remaining} left
              </span>
            ) : (
              <span className="pill">Repeats allowed</span>
            )}
            {reshuffled && <span className="pill active">Shoe shuffled</span>}
          </div>

          {draw && card && numberCard && (
            <div className="deal-stage" aria-live="polite">
              <button
                type="button"
                key={dealKey}
                className="deal-cue"
                onClick={toggleReveal}
                aria-pressed={revealed}
                aria-label={
                  revealed
                    ? 'Hide the stack answer'
                    : settings.generatorMode === 'card'
                      ? 'Reveal stack number'
                      : settings.generatorMode === 'number'
                        ? 'Reveal the card'
                        : 'Reveal stack answers'
                }
              >
                {settings.generatorMode === 'card' && (
                  <>
                    <div className="deal-card-wrap prompt-area">
                      <PlayingCard card={card} width="clamp(150px, 38vw, 210px)" />
                    </div>
                    <p className="deal-card-name">{cardLabel(card)}</p>
                  </>
                )}
                {settings.generatorMode === 'number' && (
                  <>
                    <div className="deal-number-wrap">
                      <div className="position-badge">
                        {draw.numberPosition}
                        <small>What card is at this position?</small>
                      </div>
                    </div>
                    <div className="deal-card-wrap prompt-area">
                      {revealed ? (
                        <PlayingCard card={numberCard} width="clamp(120px, 30vw, 170px)" />
                      ) : (
                        <CardBack width="clamp(120px, 30vw, 170px)" />
                      )}
                    </div>
                  </>
                )}
                {settings.generatorMode === 'both' && (
                  <div className="deal-both">
                    <div className="deal-both-col">
                      <span className="deal-kicker">Named card</span>
                      <div className="deal-card-wrap prompt-area">
                        <PlayingCard card={card} width="clamp(120px, 30vw, 170px)" />
                      </div>
                      <p className="deal-card-name">{cardLabel(card)}</p>
                    </div>
                    <div className="deal-both-col">
                      <span className="deal-kicker">Named number</span>
                      <div className="position-badge deal-both-number">
                        {draw.numberPosition}
                      </div>
                    </div>
                  </div>
                )}
              </button>

              <button
                type="button"
                className={`deal-answer${revealed ? ' open' : ''}`}
                onClick={toggleReveal}
              >
                {revealed ? (
                  settings.generatorMode === 'card' ? (
                    <>
                      <span className="deck-position-num">#{draw.cardPosition}</span>
                      <span className="deck-position-of">of 52</span>
                    </>
                  ) : settings.generatorMode === 'number' ? (
                    <span className="deal-answer-copy">{cardLabel(numberCard)}</span>
                  ) : (
                    <div className="deal-acaaan-answers">
                      {miracle && (
                        <p className="deal-miracle">Already there — a miracle.</p>
                      )}
                      <div className="deal-acaaan-row">
                        <span className="muted">Named card is</span>
                        <strong>#{draw.cardPosition}</strong>
                      </div>
                      <div className="deal-acaaan-row">
                        <span className="muted">Position {draw.numberPosition} is</span>
                        <strong>{cardLabel(numberCard)}</strong>
                      </div>
                    </div>
                  )
                ) : (
                  <span className="deal-answer-hint">
                    {settings.generatorMode === 'card'
                      ? 'Tap to reveal the stack number'
                      : settings.generatorMode === 'number'
                        ? 'Tap to reveal the card'
                        : 'Tap to reveal stack answers'}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="deal-actions">
            <button type="button" className="btn primary block" onClick={() => dealNext()}>
              Deal next
            </button>
            {settings.generatorNoRepeats && (
              <button
                type="button"
                className="btn ghost block"
                onClick={() => dealNext({ resetShoe: true })}
              >
                Reshuffle shoe
              </button>
            )}
          </div>
          <p className="muted center deal-hint">
            Space deals the next prompt. R reveals the answer.
          </p>

          {history.length > 0 && (
            <div className="deal-history">
              <h2>Recent</h2>
              <ol className="deal-history-list">
                {history.map((item, i) => {
                  const histCard = cardAtPosition(item.cardPosition);
                  return (
                    <li key={`${item.cardPosition}-${item.numberPosition}-${i}`}>
                      <span className="deal-history-card">
                        <PlayingCard card={histCard} width={44} />
                      </span>
                      <span className="deal-history-meta">
                        {settings.generatorMode === 'number'
                          ? `#${item.numberPosition} · ${cardLabel(histCard)}`
                          : settings.generatorMode === 'both'
                            ? `${cardLabel(histCard)} · named #${item.numberPosition}`
                            : `${cardLabel(histCard)} · #${item.cardPosition}`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
