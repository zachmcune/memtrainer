import { ScopeControls } from './ScopeControls';
import { scopeSummary } from '../data/scopeSummary';
import type { ScopeConfig } from '../db/types';

interface CollapsibleScopePanelProps {
  scope: ScopeConfig;
  onChange: (scope: ScopeConfig) => void;
  idPrefix?: string;
  /** When true the panel starts collapsed. */
  defaultCollapsed?: boolean;
}

export function CollapsibleScopePanel({
  scope,
  onChange,
  idPrefix = '',
  defaultCollapsed = true,
}: CollapsibleScopePanelProps) {
  return (
    <details className="scope-details" open={!defaultCollapsed ? true : undefined}>
      <summary className="scope-details-summary">
        <span className="scope-details-title">Cards to show</span>
        <span className="scope-details-meta">{scopeSummary(scope)}</span>
      </summary>
      <div className="scope-details-body">
        <ScopeControls scope={scope} onChange={onChange} idPrefix={idPrefix} />
      </div>
    </details>
  );
}
