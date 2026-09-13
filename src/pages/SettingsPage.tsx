import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { appSettingsRepositoryClient } from '../db/appSettingsRepositoryClient'
import { itemCategoryService } from '../services/itemCategoryService'
import { getStoredTheme, setTheme } from '../theme'
import type { ThemeMode } from '../theme'
import { SUPPORTED_LANGUAGES, setLanguage } from '../i18n'
import type { SupportedLanguage } from '../i18n'
import type { ItemCategory } from '../domain/models'
import { notify } from '../notifications'
import { useAuth } from '../auth/AuthContext'
import {
  challengeAndVerifyTotp,
  enrollTotp,
  listTotpFactors,
  unenrollTotp,
} from '../auth/mfa'
import type { TotpEnrollment, TotpFactor } from '../auth/mfa'
import {
  exportAllData,
  importAllData,
  isAccountBackup,
  IMPORT_CONFIRMATION_PHRASE,
} from '../services/dataBackupService'
import {
  convertLegacyBackupToAccountBackup,
  isLegacyLocalBackup,
} from '../services/legacyBackupImportService'
import { resolveSaveDestination } from '../utils/saveFile'
import '../auth/AuthGate.css'
import './SettingsPage.css'

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user, refreshMfaStatus } = useAuth()
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(0)
  const [nextEstimateNumber, setNextEstimateNumber] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)

  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState<string>('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState<string>('')

  // Account & security — TOTP (authenticator app) two-factor login.
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([])
  const [enrolling, setEnrolling] = useState<TotpEnrollment | null>(null)
  const [enrollCode, setEnrollCode] = useState<string>('')
  const [mfaBusy, setMfaBusy] = useState<boolean>(false)

  // Data export / destructive import (SettingsPage "Data" section below).
  const [exporting, setExporting] = useState<boolean>(false)
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPassword, setImportPassword] = useState<string>('')
  const [importConfirmPhrase, setImportConfirmPhrase] = useState<string>('')
  const [importing, setImporting] = useState<boolean>(false)

  const loadCategories = async () => {
    setCategories(await itemCategoryService.listItemCategories())
  }

  const loadTotpFactors = async () => {
    try {
      setTotpFactors(await listTotpFactors())
    } catch (err) {
      console.error('Failed to load two-factor methods:', err)
    }
  }

  useEffect(() => {
    setThemeState(getStoredTheme())
    appSettingsRepositoryClient.get().then((settings) => {
      setDefaultTaxRate(settings.defaultTaxRate)
      setNextEstimateNumber(settings.nextEstimateNumber)
      setLoading(false)
    })
    loadCategories()
    loadTotpFactors()
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
      await appSettingsRepositoryClient.update({ defaultTaxRate, nextEstimateNumber })
      setSaved(true)
    } catch (err) {
      console.error('Failed to save estimate defaults:', { defaultTaxRate, nextEstimateNumber, error: err })
      notify(err instanceof Error ? err.message : t('settings.estimateDefaults.errors.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      await itemCategoryService.createItemCategory(newCategoryName)
      setNewCategoryName('')
      await loadCategories()
    } catch (err) {
      console.error('Failed to create item category:', { newCategoryName, error: err })
      notify(err instanceof Error ? err.message : t('settings.itemCategories.errors.saveFailed'), 'error')
    }
  }

  const startEditingCategory = (category: ItemCategory) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  const cancelEditingCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategoryId || !editingCategoryName.trim()) return
    try {
      await itemCategoryService.renameItemCategory(editingCategoryId, editingCategoryName)
      cancelEditingCategory()
      await loadCategories()
    } catch (err) {
      console.error('Failed to rename item category:', {
        editingCategoryId,
        editingCategoryName,
        error: err,
      })
      notify(err instanceof Error ? err.message : t('settings.itemCategories.errors.saveFailed'), 'error')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('settings.itemCategories.confirmDelete'))) return
    try {
      await itemCategoryService.deleteItemCategory(id)
      await loadCategories()
    } catch (err) {
      notify(err instanceof Error ? err.message : t('settings.itemCategories.errors.deleteFailed'), 'error')
    }
  }

  const handleStartMfaEnrollment = async () => {
    setMfaBusy(true)
    try {
      setEnrolling(await enrollTotp())
      setEnrollCode('')
    } catch (err) {
      notify(err instanceof Error ? err.message : t('settings.security.errors.enrollFailed'), 'error')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleConfirmMfaEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrolling) return
    setMfaBusy(true)
    try {
      await challengeAndVerifyTotp(enrolling.factorId, enrollCode.trim())
      setEnrolling(null)
      setEnrollCode('')
      await loadTotpFactors()
      await refreshMfaStatus()
      notify(t('settings.security.enrollSuccess'), 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : t('settings.security.errors.enrollFailed'), 'error')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleCancelMfaEnrollment = () => {
    setEnrolling(null)
    setEnrollCode('')
  }

  const handleRemoveTotpFactor = async (factorId: string) => {
    if (!window.confirm(t('settings.security.confirmRemove'))) return
    setMfaBusy(true)
    try {
      await unenrollTotp(factorId)
      await loadTotpFactors()
      await refreshMfaStatus()
    } catch (err) {
      notify(err instanceof Error ? err.message : t('settings.security.errors.removeFailed'), 'error')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      // Resolved before the (network) data fetch below — see
      // resolveSaveDestination's doc comment: a browser's save picker only
      // stays available while the click that triggered it is still an
      // active user gesture, so the destination must be chosen first.
      const destination = await resolveSaveDestination(`presupeitor2000-backup-${Date.now()}.json`, [
        { name: 'JSON', extensions: ['json'] },
      ])
      if (!destination) return

      const backup = await exportAllData()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      await destination.write(blob)
    } catch (err) {
      notify(err instanceof Error ? err.message : t('settings.data.errors.exportFailed'), 'error')
    } finally {
      setExporting(false)
    }
  }

  const openImportModal = () => {
    setImportFile(null)
    setImportPassword('')
    setImportConfirmPhrase('')
    setImportModalOpen(true)
  }

  const closeImportModal = () => {
    setImportModalOpen(false)
  }

  const importReady =
    importFile !== null && importPassword.length > 0 && importConfirmPhrase === IMPORT_CONFIRMATION_PHRASE

  const handleImportData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importReady || !importFile) return
    setImporting(true)
    try {
      const text = await importFile.text()
      const parsed = JSON.parse(text)
      // Two different file formats can land here: a full account export
      // (Settings → Data → "Export all data") and a *local* backup — the
      // raw pre-Supabase localStorage dump offered by the one-time notice
      // shown right after signing in on a machine with old local data
      // (LocalBackupNotice). The latter needs converting to the account
      // export shape before it can be imported the same way.
      const backup = isLegacyLocalBackup(parsed) ? convertLegacyBackupToAccountBackup(parsed) : parsed
      if (!isAccountBackup(backup)) {
        notify(t('settings.data.errors.invalidFile'), 'error')
        return
      }
      await importAllData(backup, importPassword)
      notify(t('settings.data.importSuccess'), 'success')
      setImportModalOpen(false)
      // Every page/service in the app holds its own already-loaded state
      // from before the wipe-and-replace; reloading is the simplest way to
      // guarantee nothing keeps showing data that the import just deleted.
      window.location.reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : t('settings.data.errors.importFailed'), 'error')
    } finally {
      setImporting(false)
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

      <fieldset className="settings-section">
        <legend>{t('settings.language.title')}</legend>
        <p className="settings-section-description">{t('settings.language.description')}</p>
        <div className="theme-options" role="radiogroup" aria-label={t('settings.language.title')}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <label key={lang} className="theme-option">
              <input
                type="radio"
                name="language"
                value={lang}
                checked={i18n.language === lang}
                onChange={() => setLanguage(lang as SupportedLanguage)}
              />
              {t(`settings.language.options.${lang}`)}
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
          <div className="form-group">
            <label>
              {t('settings.estimateDefaults.nextEstimateNumber')}
              <input
                type="number"
                value={nextEstimateNumber}
                onChange={(e) => setNextEstimateNumber(parseInt(e.target.value, 10) || 1)}
                min="1"
                step="1"
              />
            </label>
            <p className="settings-section-description">
              {t('settings.estimateDefaults.nextEstimateNumberHint')}
            </p>
          </div>
          <div className="form-actions">
            {saved && <span className="saved-indicator">{t('settings.saved')}</span>}
            <button type="submit" className="submit-button" disabled={saving}>
              {saving ? t('settings.saving') : t('common.save')}
            </button>
          </div>
        </fieldset>
      </form>

      <fieldset className="settings-section">
        <legend>{t('settings.itemCategories.title')}</legend>
        <p className="settings-section-description">{t('settings.itemCategories.description')}</p>

        <ul className="category-list">
          {categories.map((category) => (
            <li key={category.id} className="category-list-item">
              {editingCategoryId === category.id ? (
                <form onSubmit={handleRenameCategory} className="category-edit-form">
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    aria-label={t('settings.itemCategories.renameAriaLabel', { name: category.name })}
                    required
                  />
                  <button type="submit" className="actions-button">
                    {t('common.save')}
                  </button>
                  <button type="button" onClick={cancelEditingCategory} className="cancel-button">
                    {t('common.cancel')}
                  </button>
                </form>
              ) : (
                <>
                  <span className="category-name">{category.name}</span>
                  <button
                    type="button"
                    onClick={() => startEditingCategory(category)}
                    className="actions-button"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="delete-button"
                  >
                    {t('common.delete')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddCategory} className="category-add-form">
          <label>
            {t('settings.itemCategories.newCategoryLabel')}
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('settings.itemCategories.newCategoryPlaceholder')}
            />
          </label>
          <button type="submit" className="submit-button">
            {t('settings.itemCategories.addButton')}
          </button>
        </form>
      </fieldset>

      <fieldset className="settings-section">
        <legend>{t('settings.security.title')}</legend>
        <p className="settings-section-description">
          {t('settings.security.description', { email: user?.email ?? '' })}
        </p>

        {totpFactors.filter((f) => f.status === 'verified').length === 0 && !enrolling && (
          <button type="button" onClick={handleStartMfaEnrollment} className="add-button" disabled={mfaBusy}>
            {t('settings.security.enableButton')}
          </button>
        )}

        {enrolling && (
          <div className="settings-mfa-enroll">
            <p>{t('settings.security.scanInstructions')}</p>
            <div
              className="settings-mfa-qr"
              // Supabase returns the enrollment QR code as a ready-to-render
              // inline SVG string (`data.totp.qr_code`) — there is no image
              // URL to point an <img> at instead.
              dangerouslySetInnerHTML={{ __html: enrolling.qrCodeSvg }}
            />
            <p className="settings-mfa-secret">
              {t('settings.security.manualEntryLabel')} <code>{enrolling.secret}</code>
            </p>
            <form onSubmit={handleConfirmMfaEnrollment} className="form-group">
              <label>
                {t('settings.security.codeLabel')}
                <input
                  type="text"
                  inputMode="numeric"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <div className="form-actions">
                <button type="button" onClick={handleCancelMfaEnrollment} className="cancel-button">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="submit-button" disabled={mfaBusy}>
                  {t('settings.security.confirmButton')}
                </button>
              </div>
            </form>
          </div>
        )}

        {totpFactors.filter((f) => f.status === 'verified').length > 0 && (
          <ul className="category-list">
            {totpFactors
              .filter((f) => f.status === 'verified')
              .map((factor) => (
                <li key={factor.id} className="category-list-item">
                  <span className="category-name">{t('settings.security.authenticatorAppLabel')}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTotpFactor(factor.id)}
                    className="delete-button"
                    disabled={mfaBusy}
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="settings-section">
        <legend>{t('settings.data.title')}</legend>
        <p className="settings-section-description">{t('settings.data.description')}</p>
        <div className="form-actions">
          <button type="button" onClick={handleExportData} className="add-button" disabled={exporting}>
            {exporting ? t('settings.data.exporting') : t('settings.data.exportButton')}
          </button>
          <button type="button" onClick={openImportModal} className="delete-button">
            {t('settings.data.importButton')}
          </button>
        </div>
      </fieldset>

      {importModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{t('settings.data.importModal.title')}</h2>

            <div className="auth-gate-warning-box">
              <p>
                <strong>{t('settings.data.importModal.warningTitle')}</strong>
              </p>
              <p>{t('settings.data.importModal.warningBody')}</p>
            </div>
            <div className="auth-gate-warning-box">
              <p>{t('settings.data.importModal.warningIrreversible')}</p>
            </div>

            <form onSubmit={handleImportData} className="customer-form">
              <div className="form-group">
                <label>
                  {t('settings.data.importModal.fileLabel')}
                  <p className="settings-section-description">
                    {t('settings.data.importModal.fileHint')}
                  </p>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('settings.data.importModal.passwordLabel')}
                  <input
                    type="password"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('settings.data.importModal.confirmPhraseLabel', {
                    phrase: IMPORT_CONFIRMATION_PHRASE,
                  })}
                  <input
                    type="text"
                    value={importConfirmPhrase}
                    onChange={(e) => setImportConfirmPhrase(e.target.value)}
                    placeholder={IMPORT_CONFIRMATION_PHRASE}
                    required
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeImportModal} className="cancel-button">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="delete-button" disabled={!importReady || importing}>
                  {importing ? t('settings.data.importModal.importing') : t('settings.data.importModal.confirmButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
