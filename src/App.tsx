import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'

// Import page components
import DashboardPage from './pages/DashboardPage'
import EstimatesPage from './pages/EstimatesPage'
import CustomersPage from './pages/CustomersPage'
import ItemLibraryPage from './pages/ItemLibraryPage'
import TemplatesPage from './pages/TemplatesPage'
import CompanyProfilePage from './pages/CompanyProfilePage'
import SettingsPage from './pages/SettingsPage'

const MainLayout: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Construction Estimate & Quote Management</h1>
      </header>
      <nav className="app-nav">
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          <li>
            <Link to="/estimates">Estimates</Link>
          </li>
          <li>
            <Link to="/customers">Customers</Link>
          </li>
          <li>
            <Link to="/item-library">Item Library</Link>
          </li>
          <li>
            <Link to="/templates">Templates</Link>
          </li>
          <li>
            <Link to="/company-profile">Company / User Profile</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
        </ul>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/estimates" element={<EstimatesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/item-library" element={<ItemLibraryPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/company-profile" element={<CompanyProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  )
}

export default App
