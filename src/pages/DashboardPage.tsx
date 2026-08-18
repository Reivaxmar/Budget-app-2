import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getDashboardOverview } from '../services/dashboardService'
import type { DashboardOverview } from '../services/dashboardService'
import './DashboardPage.css'

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return dateString
  }
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    getDashboardOverview().then((data) => {
      setOverview(data)
      setLoading(false)
    })
  }, [])

  if (loading || !overview) {
    return (
      <div className="dashboard-page">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.loading')}</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <h1>{t('dashboard.title')}</h1>

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{overview.customerCount}</span>
          <span className="dashboard-stat-label">{t('dashboard.stats.customers')}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{overview.estimateCount}</span>
          <span className="dashboard-stat-label">{t('dashboard.stats.estimates')}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{overview.estimatesByStatus.draft ?? 0}</span>
          <span className="dashboard-stat-label">{t('dashboard.stats.draftEstimates')}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{overview.estimatesByStatus.issued ?? 0}</span>
          <span className="dashboard-stat-label">{t('dashboard.stats.issuedEstimates')}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-value">{overview.totalValue.toFixed(2)}</span>
          <span className="dashboard-stat-label">{t('dashboard.stats.totalValue')}</span>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <h2>{t('dashboard.quickActions.title')}</h2>
        <button onClick={() => navigate('/estimates/new')} className="add-button">
          {t('dashboard.quickActions.newEstimate')}
        </button>
        <button onClick={() => navigate('/customers')} className="add-button">
          {t('dashboard.quickActions.newCustomer')}
        </button>
      </div>

      <div className="dashboard-recent">
        <h2>{t('dashboard.recentEstimates.title')}</h2>
        {overview.recentEstimates.length === 0 ? (
          <p>{t('dashboard.recentEstimates.empty')}</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('dashboard.recentEstimates.columns.estimateNumber')}</th>
                  <th>{t('dashboard.recentEstimates.columns.customer')}</th>
                  <th>{t('dashboard.recentEstimates.columns.subject')}</th>
                  <th>{t('dashboard.recentEstimates.columns.date')}</th>
                  <th>{t('dashboard.recentEstimates.columns.status')}</th>
                  <th>{t('dashboard.recentEstimates.columns.total')}</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentEstimates.map((estimate) => (
                  <tr
                    key={estimate.id}
                    className="dashboard-recent-row"
                    onClick={() => navigate(`/estimates/${estimate.id}/edit`)}
                  >
                    <td>{estimate.estimateNumber}</td>
                    <td>{estimate.customerName}</td>
                    <td>{estimate.subject}</td>
                    <td>{formatDate(estimate.creationDate)}</td>
                    <td>{estimate.status}</td>
                    <td>{estimate.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
