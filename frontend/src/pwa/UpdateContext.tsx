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
import {
  APP_VERSION,
  fetchLatestVersion,
  isSameBuild,
  type VersionInfo,
} from '../version';

type UpdateContextValue = {
  currentVersion: VersionInfo;
  latestVersion: VersionInfo | null;
  updateAvailable: boolean;
  isUpToDate: boolean;
  checking: boolean;
  applyUpdate: () => void;
  checkForUpdates: () => Promise<void>;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const updateSwRef = useRef<(reload?: boolean) => Promise<void>>();

  const refreshLatestVersion = useCallback(async () => {
    const remote = await fetchLatestVersion();
    setLatestVersion(remote);
    return remote;
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const checkForUpdates = () => {
      void registration?.update();
      void refreshLatestVersion();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    updateSwRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setSwUpdateAvailable(true);
      },
      onRegisteredSW(_swUrl, reg) {
        registration = reg;
        if (!registration) return;

        void refreshLatestVersion();
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
  }, [refreshLatestVersion]);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      }
      await refreshLatestVersion();
    } finally {
      setChecking(false);
    }
  }, [refreshLatestVersion]);

  const applyUpdate = useCallback(() => {
    void updateSwRef.current?.(true);
  }, []);

  const remoteUpdateAvailable =
    latestVersion !== null && !isSameBuild(APP_VERSION, latestVersion);

  const updateAvailable = swUpdateAvailable || remoteUpdateAvailable;
  const isUpToDate = latestVersion !== null && isSameBuild(APP_VERSION, latestVersion) && !swUpdateAvailable;

  const value = useMemo(
    () => ({
      currentVersion: APP_VERSION,
      latestVersion,
      updateAvailable,
      isUpToDate,
      checking,
      applyUpdate,
      checkForUpdates,
    }),
    [
      latestVersion,
      updateAvailable,
      isUpToDate,
      checking,
      applyUpdate,
      checkForUpdates,
    ],
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
