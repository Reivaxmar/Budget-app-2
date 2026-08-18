import React from 'react'
import { useTranslation } from 'react-i18next'

const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  return (
    <div>
      <h1>{t('settings.title')}</h1>
      <p>{t('settings.placeholder')}</p>
    </div>
  )
}

export default SettingsPage
