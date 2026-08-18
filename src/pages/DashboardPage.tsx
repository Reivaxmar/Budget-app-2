import React from 'react'
import { useTranslation } from 'react-i18next'

const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.placeholder')}</p>
    </div>
  )
}

export default DashboardPage
