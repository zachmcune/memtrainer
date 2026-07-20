import type { AppSettings } from './types';
import { DEFAULT_SCOPE } from '../data/scopeDefaults';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  mode: 'card-to-position',
  scope: { ...DEFAULT_SCOPE },
  stackScope: { ...DEFAULT_SCOPE },
  sessionLength: 'all',
  queueStrategy: 'spaced',
  redrillMissed: true,
  showStackNeighborsOnMiss: true,
  showStackGroupOnMiss: false,
  flashPrompt: false,
  theme: 'neon-noir',
  soundEnabled: true,
  soundVolume: 0.6,
  reducedMotion: false,
};