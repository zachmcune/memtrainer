export type VersionInfo = {
  version: string;
  build: string;
  builtAt: string;
};

export const APP_VERSION: VersionInfo = {
  version: import.meta.env?.VITE_APP_VERSION ?? '1.0.0',
  build: import.meta.env?.VITE_APP_BUILD ?? 'dev',
  builtAt: import.meta.env?.VITE_APP_BUILT_AT ?? new Date(0).toISOString(),
};

export function formatVersion(info: VersionInfo = APP_VERSION): string {
  return `v${info.version} (${info.build})`;
}

export function formatBuildDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isSameBuild(a: VersionInfo, b: VersionInfo): boolean {
  return a.version === b.version && a.build === b.build;
}

export function isRemoteNewer(local: VersionInfo, remote: VersionInfo): boolean {
  const localParts = local.version.split('.').map(Number);
  const remoteParts = remote.version.split('.').map(Number);

  for (let i = 0; i < 3; i += 1) {
    const diff = (remoteParts[i] ?? 0) - (localParts[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }

  return !isSameBuild(local, remote);
}

export async function fetchLatestVersion(): Promise<VersionInfo | null> {
  try {
    const base = import.meta.env?.BASE_URL ?? '/';
    const url = `${base}version.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionInfo;
    if (!data.version || !data.build || !data.builtAt) return null;
    return data;
  } catch {
    return null;
  }
}
