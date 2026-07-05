import { computeChunks } from '../features/training/engine';
import type { ScopeConfig, ScopeType } from '../db/types';

interface ScopeControlsProps {
  scope: ScopeConfig;
  onChange: (scope: ScopeConfig) => void;
  /** Prefix for input ids when multiple pickers exist on one page. */
  idPrefix?: string;
}

export function ScopeControls({ scope, onChange, idPrefix = '' }: ScopeControlsProps) {
  const chunks = computeChunks(scope.chunkSize);
  const id = (name: string) => `${idPrefix}${name}`;

  const setScopeType = (type: ScopeType) => onChange({ ...scope, type });

  const toggleChunk = (index: number) => {
    const selected = new Set(scope.selectedChunks);
    if (selected.has(index)) selected.delete(index);
    else selected.add(index);
    onChange({ ...scope, selectedChunks: [...selected].sort((a, b) => a - b) });
  };

  return (
    <>
      <div className="seg">
        {(['all', 'chunks', 'range'] as ScopeType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={scope.type === t ? 'active' : ''}
            onClick={() => setScopeType(t)}
          >
            {t === 'all' ? 'Full deck' : t === 'chunks' ? 'Sections' : 'Range'}
          </button>
        ))}
      </div>

      {scope.type === 'chunks' && (
        <div className="card-panel scope-panel">
          <div className="field">
            <label htmlFor={id('chunkSize')}>Section size</label>
            <select
              id={id('chunkSize')}
              value={scope.chunkSize}
              onChange={(e) =>
                onChange({
                  ...scope,
                  chunkSize: Number(e.target.value),
                  selectedChunks: [0],
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
                type="button"
                className={`chunk-cell ${scope.selectedChunks.includes(c.index) ? 'selected' : ''}`}
                onClick={() => toggleChunk(c.index)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {scope.type === 'range' && (
        <div className="card-panel scope-panel">
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor={id('rangeStart')}>From position</label>
              <input
                id={id('rangeStart')}
                type="number"
                min={1}
                max={52}
                value={scope.rangeStart}
                onChange={(e) =>
                  onChange({ ...scope, rangeStart: Number(e.target.value) })
                }
              />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor={id('rangeEnd')}>To position</label>
              <input
                id={id('rangeEnd')}
                type="number"
                min={1}
                max={52}
                value={scope.rangeEnd}
                onChange={(e) =>
                  onChange({ ...scope, rangeEnd: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
