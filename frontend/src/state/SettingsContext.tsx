import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { repository } from '../db/repository';
import { DEFAULT_SETTINGS } from '../db/defaults';
import { normalizeScopeConfig } from '../data/scopeNormalize';
import type { AppSettings } from '../db/types';

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    repository.getSettings().then((s) => {
      if (active) {
        setSettings(s);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch, id: 'app' as const };
        if (patch.scope) {
          next.scope = normalizeScopeConfig(next.scope);
        }
        if (patch.stackScope) {
          next.stackScope = normalizeScopeConfig(next.stackScope);
        }
        if (patch.generatorScope) {
          next.generatorScope = normalizeScopeConfig(next.generatorScope);
        }
        void repository.saveSettings(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ settings, loading, update }),
    [settings, loading, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
