import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { companyProfileRepositoryClient } from '../db/companyProfileRepositoryClient';
import type { CompanyProfileSettings } from '../db/companyProfileRepositoryClient';
import './CompanyProfilePage.css';

// Company/user identity and document defaults shown on generated PDFs
// (SPECS.md §4 UserProfile, §6.1/§6.3 cover/header/footer, §6.4 final note).
const CompanyProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<CompanyProfileSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const data = await companyProfileRepositoryClient.get();
      setSettings(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await companyProfileRepositoryClient.update(settings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="company-profile-page">{t('companyProfile.loading')}</div>;
  }

  return (
    <div className="company-profile-page">
      <h1>{t('companyProfile.title')}</h1>
      <p className="company-profile-intro">{t('companyProfile.intro')}</p>

      <form onSubmit={handleSave} className="company-profile-form">
        <fieldset>
          <legend>{t('companyProfile.sections.identity')}</legend>
          <div className="form-group">
            <label>
              {t('companyProfile.fields.companyName')}
              <input
                type="text"
                value={settings.profile.name}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, profile: { ...prev.profile, name: e.target.value } } : prev
                  )
                }
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              {t('companyProfile.fields.address')}
              <input
                type="text"
                value={settings.profile.address}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, profile: { ...prev.profile, address: e.target.value } } : prev
                  )
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t('companyProfile.fields.postalCode')}
              <input
                type="text"
                value={settings.profile.postalCode}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, profile: { ...prev.profile, postalCode: e.target.value } }
                      : prev
                  )
                }
              />
            </label>
            <label>
              {t('companyProfile.fields.phone')}
              <input
                type="text"
                value={settings.profile.phone}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, profile: { ...prev.profile, phone: e.target.value } } : prev
                  )
                }
              />
            </label>
            <label>
              {t('companyProfile.fields.email')}
              <input
                type="email"
                value={settings.profile.email}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, profile: { ...prev.profile, email: e.target.value } } : prev
                  )
                }
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              {t('companyProfile.fields.slogan')}
              <input
                type="text"
                value={settings.profile.slogan}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, profile: { ...prev.profile, slogan: e.target.value } } : prev
                  )
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('companyProfile.sections.documentDefaults')}</legend>
          <div className="form-group">
            <label>
              {t('companyProfile.fields.creationLocation')}
              <input
                type="text"
                value={settings.creationLocation}
                onChange={(e) =>
                  setSettings((prev) => (prev ? { ...prev, creationLocation: e.target.value } : prev))
                }
              />
            </label>
          </div>
        </fieldset>

        <div className="form-actions">
          {saved && <span className="saved-indicator">{t('companyProfile.saved')}</span>}
          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? t('companyProfile.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfilePage;
