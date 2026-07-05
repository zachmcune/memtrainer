import { usePwaUpdate } from '../pwa/UpdateContext';
import { formatVersion } from '../version';

export function UpdateBanner() {
  const { updateAvailable, applyUpdate, currentVersion, latestVersion } = usePwaUpdate();

  if (!updateAvailable) return null;

  const targetLabel =
    latestVersion && latestVersion.build !== currentVersion.build
      ? formatVersion(latestVersion)
      : 'the latest version';

  return (
    <div className="banner warn update-banner" role="status">
      <p className="update-banner-text">
        This app is out of date ({formatVersion(currentVersion)} → {targetLabel}).{' '}
        <button type="button" className="update-link" onClick={applyUpdate}>
          Click here to update
        </button>
      </p>
      <p className="muted update-banner-note">
        Your stats and settings stay on this device.
      </p>
    </div>
  );
}
