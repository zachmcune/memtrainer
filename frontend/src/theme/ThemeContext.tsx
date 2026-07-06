import { useEffect, type ReactNode } from 'react';
import { useSettings } from '../state/SettingsContext';
import { soundEngine } from '../audio/soundEngine';
import { DEFAULT_THEME, isThemeId, themeMeta } from './themes';

function setMetaThemeColor(color: string) {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'theme-color';
    document.head.appendChild(tag);
  }
  tag.content = color;
}

/**
 * Applies the active color scheme + motion preference to <html>, keeps the
 * browser chrome color in sync, and mirrors sound preferences into the audio
 * engine. Must render inside SettingsProvider.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const theme = isThemeId(settings.theme) ? settings.theme : DEFAULT_THEME;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setMetaThemeColor(themeMeta(theme).metaColor);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const reduced = settings.reducedMotion || media.matches;
      root.dataset.motion = reduced ? 'reduced' : 'full';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.reducedMotion]);

  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setVolume(settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume]);

  return <>{children}</>;
}
