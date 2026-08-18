import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Update } from '@tauri-apps/plugin-updater';
import './UpdateDialog.css';

// Checks for an application update on startup (SPECS: production updates
// via tauri-plugin-updater + tauri-plugin-process). Everything Tauri-specific
// is dynamically imported and guarded by isTauri() so this component is a
// silent no-op in the browser (`npm run dev`) and in tests — it never
// throws just because it isn't running inside the packaged desktop app.
const UpdateDialog: React.FC = () => {
  const { t } = useTranslation();
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkForUpdate = async () => {
      try {
        const { isTauri } = await import('@tauri-apps/api/core');
        if (!isTauri()) {
          return;
        }

        const { check } = await import('@tauri-apps/plugin-updater');
        const result = await check();
        if (!cancelled && result?.available) {
          setUpdate(result);
        }
      } catch (err) {
        // Update checks are best-effort: no network, no GitHub release yet,
        // etc. shouldn't surface an error dialog on every app launch.
        console.error('Update check failed:', err);
      }
    };

    checkForUpdate();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdate = async () => {
    if (!update) return;
    setInstalling(true);
    setError(null);
    try {
      await update.downloadAndInstall();
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('Failed to install update:', err);
      setError(err instanceof Error ? err.message : t('update.errors.installFailed'));
      setInstalling(false);
    }
  };

  if (!update || dismissed) {
    return null;
  }

  return (
    <div className="update-dialog-overlay">
      <div className="update-dialog">
        <h2>{t('update.title')}</h2>
        <p>{t('update.description', { version: update.version })}</p>
        {error && <p className="update-dialog-error">{error}</p>}
        <div className="update-dialog-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => setDismissed(true)}
            disabled={installing}
          >
            {t('update.later')}
          </button>
          <button type="button" className="submit-button" onClick={handleUpdate} disabled={installing}>
            {installing ? t('update.installing') : t('update.updateButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateDialog;
