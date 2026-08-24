import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useTranslation, withTranslation, WithTranslation } from 'react-i18next'
import './App.css'
import {
  DashboardIcon,
  EstimatesIcon,
  CustomersIcon,
  ItemLibraryIcon,
  TemplatesIcon,
  CompanyProfileIcon,
  SettingsIcon,
} from './components/NavIcons'
import UpdateDialog from './components/UpdateDialog'
import ToastContainer from './components/ToastContainer'
import LocalBackupNotice from './components/LocalBackupNotice'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AuthGate from './auth/AuthGate'

// Import page components
import DashboardPage from './pages/DashboardPage'
import EstimatesListPage from './pages/EstimatesListPage'
import EstimateEditorPage from './pages/EstimateEditorPage'
import ItemLibraryPage from './pages/ItemLibraryPage'
import TemplatesPage from './pages/TemplatesPage'
import CompanyProfilePage from './pages/CompanyProfilePage'
import SettingsPage from './pages/SettingsPage'

const CustomersPage = lazy(() => import('./pages/CustomersPage'))

const NAV_ITEMS: Array<{
  to: string
  labelKey: string
  icon: React.FC
  end?: boolean
}> = [
  { to: '/', labelKey: 'app.nav.dashboard', icon: DashboardIcon, end: true },
  { to: '/estimates', labelKey: 'app.nav.estimates', icon: EstimatesIcon },
  { to: '/customers', labelKey: 'app.nav.customers', icon: CustomersIcon },
  { to: '/item-library', labelKey: 'app.nav.itemLibrary', icon: ItemLibraryIcon },
  { to: '/templates', labelKey: 'app.nav.templates', icon: TemplatesIcon },
  { to: '/company-profile', labelKey: 'app.nav.companyProfile', icon: CompanyProfileIcon },
  { to: '/settings', labelKey: 'app.nav.settings', icon: SettingsIcon },
]

type ErrorBoundaryState = {
  hasError: boolean
}

// A class component can't use the useTranslation() hook, so it's wrapped
// with withTranslation() instead — same translation resources, just the
// HOC form react-i18next provides for non-function components.
class RouteErrorBoundaryBase extends React.Component<
  React.PropsWithChildren<WithTranslation>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Route render error:', error)
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props
      return (
        <div>
          <h2>{t('app.errorBoundary.title')}</h2>
          <p>{t('app.errorBoundary.message')}</p>
        </div>
      )
    }

    return this.props.children
  }
}

const RouteErrorBoundary = withTranslation()(RouteErrorBoundaryBase)

const MainLayout: React.FC = () => {
  const location = useLocation()
  const { t } = useTranslation()
  const { user, signOut } = useAuth()

  return (
    <div className="app">
      <UpdateDialog />
      <ToastContainer />
      <LocalBackupNotice />
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand-mark">P2K</span>
          <span className="app-brand-name">{t('app.brandName')}</span>
        </div>
        <nav className="app-nav">
          <ul>
            {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  <Icon />
                  <span>{t(labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <h1>{t('app.brandName')}</h1>
          {user && (
            <div className="app-topbar-account">
              <span>{user.email}</span>
              <button type="button" className="cancel-button" onClick={() => signOut()}>
                {t('auth.signOutButton')}
              </button>
            </div>
          )}
        </header>
        <main className="app-main">
          <RouteErrorBoundary key={location.pathname}>
            <Suspense fallback={<p>{t('common.loading')}</p>}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/estimates" element={<EstimatesListPage />} />
                <Route path="/estimates/new" element={<EstimateEditorPage />} />
                <Route path="/estimates/:id/edit" element={<EstimateEditorPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/item-library" element={<ItemLibraryPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/company-profile" element={<CompanyProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  )
}

const AuthenticatedApp: React.FC = () => {
  const { t } = useTranslation()
  const { status } = useAuth()

  if (status === 'loading') {
    return <p className="app-loading">{t('common.loading')}</p>
  }

  if (status === 'signed-out' || status === 'mfa-required') {
    return <AuthGate />
  }

  return <MainLayout />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
