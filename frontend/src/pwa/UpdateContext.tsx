import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { registerSW } from 'virtual:pwa-register';

type UpdateContextValue = {
  updateAvailable: boolean;
  applyUpdate: () => void;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateSwRef = useRef<(reload?: boolean) => Promise<void>>();

  useEffect(() => {
    let intervalId: number | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const checkForUpdates = () => {
      void registration?.update();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    updateSwRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateAvailable(true);
      },
      onRegisteredSW(_swUrl, reg) {
        registration = reg;
        if (!registration) return;

        document.addEventListener('visibilitychange', onVisibilityChange);
        intervalId = window.setInterval(checkForUpdates, UPDATE_CHECK_MS);
      },
    });

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const applyUpdate = useCallback(() => {
    void updateSwRef.current?.(true);
  }, []);

  const value = useMemo(
    () => ({ updateAvailable, applyUpdate }),
    [updateAvailable, applyUpdate],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function usePwaUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    throw new Error('usePwaUpdate must be used within UpdateProvider');
  }
  return ctx;
}
