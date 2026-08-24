import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  acknowledgeLegacyDataBackup,
  buildLegacyDataBackup,
  hasUnacknowledgedLegacyData,
} from '../services/legacyLocalDataService';
import { saveJsonFile } from '../utils/saveFile';
import { notify } from '../notifications';
import '../auth/AuthGate.css';

/**
 * Blocking, one-time notice shown right after signing in on a machine that
 * still has data from the old local-only (localStorage) version of the app.
 * That data is never migrated automatically into the signed-in account's
 * Supabase data — it's local to this machine, not tied to any account — so
 * this exists purely to make sure the user gets a chance to export it
 * before it's effectively orphaned.
 */
const LocalBackupNotice: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<boolean>(() => hasUnacknowledgedLegacyData());
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  if (!visible) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const saved = await saveJsonFile(
        `presupeitor2000-local-backup-${Date.now()}.json`,
        buildLegacyDataBackup()
      );
      if (saved) {
        setDownloaded(true);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : t('localBackup.exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleContinue = () => {
    acknowledgeLegacyDataBackup();
    setVisible(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{t('localBackup.title')}</h2>
        <p>{t('localBackup.description')}</p>
        <div className="auth-gate-warning-box">
          <p>{t('localBackup.warning')}</p>
        </div>
        <div className="form-actions">
          <button type="button" onClick={handleExport} className="add-button" disabled={exporting}>
            {exporting ? t('localBackup.exporting') : t('localBackup.exportButton')}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="submit-button"
            disabled={!downloaded}
            title={!downloaded ? t('localBackup.continueDisabledHint') : undefined}
          >
            {t('localBackup.continueButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalBackupNotice;
