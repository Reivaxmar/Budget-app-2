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
import './SettingsPage.css'

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)

  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState<string>('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState<string>('')

  const loadCategories = async () => {
    setCategories(await itemCategoryService.listItemCategories())
  }

  useEffect(() => {
    setThemeState(getStoredTheme())
    appSettingsRepositoryClient.get().then((settings) => {
      setDefaultTaxRate(settings.defaultTaxRate)
      setLoading(false)
    })
    loadCategories()
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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      await itemCategoryService.createItemCategory(newCategoryName)
      setNewCategoryName('')
      await loadCategories()
    } catch (err) {
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
    </div>
  )
}

export default SettingsPage
