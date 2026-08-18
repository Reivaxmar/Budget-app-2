import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { appSettingsRepositoryClient } from '../db/appSettingsRepositoryClient'
import { getStoredTheme, setTheme } from '../theme'
import type { ThemeMode } from '../theme'
import './SettingsPage.css'

const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)

  useEffect(() => {
    setThemeState(getStoredTheme())
    appSettingsRepositoryClient.get().then((settings) => {
      setDefaultTaxRate(settings.defaultTaxRate)
      setLoading(false)
    })
  }, [])

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeState(mode)
    setTheme(mode)
  }

  const handleSaveEstimateDefaults = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await appSettingsRepositoryClient.update({ defaultTaxRate })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="settings-page">{t('common.loading')}</div>
  }

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      <fieldset className="settings-section">
        <legend>{t('settings.appearance.title')}</legend>
        <p className="settings-section-description">{t('settings.appearance.description')}</p>
        <div className="theme-options" role="radiogroup" aria-label={t('settings.appearance.title')}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <label key={mode} className="theme-option">
              <input
                type="radio"
                name="theme"
                value={mode}
                checked={theme === mode}
                onChange={() => handleThemeChange(mode)}
              />
              {t(`settings.appearance.options.${mode}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <form onSubmit={handleSaveEstimateDefaults} className="settings-section">
        <fieldset>
          <legend>{t('settings.estimateDefaults.title')}</legend>
          <p className="settings-section-description">{t('settings.estimateDefaults.description')}</p>
          <div className="form-group">
            <label>
              {t('settings.estimateDefaults.defaultTaxRate')}
              <input
                type="number"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </label>
          </div>
          <div className="form-actions">
            {saved && <span className="saved-indicator">{t('settings.saved')}</span>}
            <button type="submit" className="submit-button" disabled={saving}>
              {saving ? t('settings.saving') : t('common.save')}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}

export default SettingsPage
