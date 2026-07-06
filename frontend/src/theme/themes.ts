import type { ThemeId } from '../db/types';

export interface ThemeMeta {
  id: ThemeId;
  /** Human-readable name shown in the picker. */
  label: string;
  /** One-line flavor text. */
  description: string;
  /**
   * Swatch colors for the picker preview, in order:
   * [background, accent, gold/secondary].
   */
  swatches: [string, string, string];
  /** Color reported to the browser/OS chrome (address bar, status bar). */
  metaColor: string;
}

/**
 * Color-scheme registry. The actual CSS custom properties for each theme live
 * in `index.css` under `[data-theme="<id>"]`; this file only holds metadata the
 * UI needs (labels, preview swatches, browser chrome color).
 */
export const THEMES: ThemeMeta[] = [
  {
    id: 'neon-noir',
    label: 'Neon Noir',
    description: 'Aqua neon & gold on near-black. The signature table.',
    swatches: ['#070a10', '#3ce0e6', '#f4c76a'],
    metaColor: '#070a10',
  },
  {
    id: 'emerald-royale',
    label: 'Emerald Royale',
    description: 'Baize green & gold — the classic felt, modernized.',
    swatches: ['#04110c', '#3ce6a4', '#f4c76a'],
    metaColor: '#04110c',
  },
  {
    id: 'crimson-highroller',
    label: 'Crimson High-Roller',
    description: 'Rose-red glow & gold on deep ink.',
    swatches: ['#0e0608', '#ff5c7a', '#f4c76a'],
    metaColor: '#0e0608',
  },
  {
    id: 'violet-lux',
    label: 'Violet Lux',
    description: 'Magenta neon with an icy blue edge.',
    swatches: ['#0b0714', '#b57bff', '#7de3ff'],
    metaColor: '#0b0714',
  },
  {
    id: 'azure-ice',
    label: 'Azure Ice',
    description: 'Cool electric blue & soft white.',
    swatches: ['#050b13', '#4fb8ff', '#dbeeff'],
    metaColor: '#050b13',
  },
  {
    id: 'gold-midnight',
    label: 'Gold Midnight',
    description: 'Warm amber gold on brown-black.',
    swatches: ['#0c0906', '#f4c76a', '#ffe6a8'],
    metaColor: '#0c0906',
  },
];

export const DEFAULT_THEME: ThemeId = 'neon-noir';

const THEME_IDS = new Set<ThemeId>(THEMES.map((t) => t.id));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value as ThemeId);
}

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
