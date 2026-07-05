import { usePwaUpdate } from '../pwa/UpdateContext';

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = usePwaUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="banner warn update-banner" role="status">
      <p className="update-banner-text">
        This app is out of date.{' '}
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
