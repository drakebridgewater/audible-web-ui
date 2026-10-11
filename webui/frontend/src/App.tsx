import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api/client'
import type { Me } from './api/types'
import { AdminSettingsPage } from './routes/AdminSettingsPage'
import { ConnectAudiblePage } from './routes/ConnectAudiblePage'
import { DashboardPage } from './routes/DashboardPage'
import { RunDetailPage } from './routes/RunDetailPage'
import { RunHistoryPage } from './routes/RunHistoryPage'
import { SignedOutPage } from './routes/SignedOutPage'

export function App() {
  const [me, setMe] = useState<Me | null>(null)
  const signedOut = useLocation().pathname === '/signed-out'

  useEffect(() => {
    // On /signed-out a 401 from /api/me would redirect to the login flow.
    if (!signedOut) api.me().then(setMe)
  }, [signedOut])

  const handleLogout = async () => {
    let redirect = '/signed-out'
    try {
      redirect = (await api.logout()).redirect
    } catch {
      // Already logged out (401) or the server is unreachable: still leave.
    }
    window.location.href = redirect
  }

  if (signedOut) return <SignedOutPage />

  return (
    <div className="app">
      <nav className="nav">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/runs">History</NavLink>
        {me?.is_admin && <NavLink to="/admin">Admin</NavLink>}
        <span className="nav-spacer" />
        {me && <span className="muted">{me.display_name ?? me.email}</span>}
        <button className="link-button" onClick={handleLogout}>
          Log out
        </button>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/connect-audible" element={<ConnectAudiblePage />} />
          <Route path="/runs" element={<RunHistoryPage />} />
          <Route path="/runs/:runId" element={<RunDetailPage />} />
          {me?.is_admin && <Route path="/admin" element={<AdminSettingsPage />} />}
        </Routes>
      </main>
    </div>
  )
}
