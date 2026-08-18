import React, { useEffect, useState } from 'react';
import { companyProfileRepositoryClient } from '../db/companyProfileRepositoryClient';
import type { CompanyProfileSettings } from '../db/companyProfileRepositoryClient';
import './CompanyProfilePage.css';

// Company/user identity and document defaults shown on generated PDFs
// (SPECS.md §4 UserProfile, §6.1/§6.3 cover/header/footer, §6.4 final note).
const CompanyProfilePage: React.FC = () => {
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
    return <div className="company-profile-page">Loading company profile...</div>;
  }

  return (
    <div className="company-profile-page">
      <h1>Company / User Profile</h1>
      <p className="company-profile-intro">
        This identity and these defaults appear on every exported estimate PDF: the cover,
        the repeating header/footer, and the final page.
      </p>

      <form onSubmit={handleSave} className="company-profile-form">
        <fieldset>
          <legend>Company identity</legend>
          <div className="form-group">
            <label>
              Company / user name:
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
              Address:
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
              Postal code:
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
              Phone:
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
              Email:
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
              Slogan:
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
          <legend>Document defaults</legend>
          <div className="form-group">
            <label>
              Creation location (e.g. "Barcelona"):
              <input
                type="text"
                value={settings.creationLocation}
                onChange={(e) =>
                  setSettings((prev) => (prev ? { ...prev, creationLocation: e.target.value } : prev))
                }
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Final-page note title:
              <input
                type="text"
                value={settings.standardNote.title}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, standardNote: { ...prev.standardNote, title: e.target.value } }
                      : prev
                  )
                }
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Final-page note content:
              <textarea
                rows={4}
                value={settings.standardNote.content}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, standardNote: { ...prev.standardNote, content: e.target.value } }
                      : prev
                  )
                }
              />
            </label>
          </div>
        </fieldset>

        <div className="form-actions">
          {saved && <span className="saved-indicator">Saved.</span>}
          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfilePage;
