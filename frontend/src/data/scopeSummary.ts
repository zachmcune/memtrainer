import { resolveScopePositions } from '../features/training/engine';
import type { ScopeConfig } from '../db/types';

export function scopeSummary(scope: ScopeConfig): string {
  const count = resolveScopePositions(scope).length;
  if (scope.type === 'all') return `Full deck · ${count} cards`;
  if (scope.type === 'range') {
    const lo = Math.min(scope.rangeStart, scope.rangeEnd);
    const hi = Math.max(scope.rangeStart, scope.rangeEnd);
    return `Positions ${lo}–${hi} · ${count} cards`;
  }
  return `${count} card${count === 1 ? '' : 's'} in selected sections`;
}
