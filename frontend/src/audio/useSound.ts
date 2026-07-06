import { useCallback } from 'react';
import { soundEngine, type SoundName } from './soundEngine';

/**
 * Returns a stable `play(name)` for triggering UI sound effects. Enable/volume
 * state is owned by the engine (mirrored from settings by ThemeProvider), so
 * callers can fire sounds freely and muting is handled centrally.
 */
export function useSound() {
  const play = useCallback((name: SoundName) => {
    soundEngine.play(name);
  }, []);
  return play;
}
