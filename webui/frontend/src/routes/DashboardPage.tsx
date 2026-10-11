import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { AudibleAccountInfo, ImportReadiness, ImportRunDetail, ImportRunSummary } from '../api/types'
import { RunStatusTable } from '../components/RunStatusTable'
import { StatusBadge } from '../components/StatusBadge'
import { usePolling } from '../hooks/usePolling'

export function DashboardPage() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<AudibleAccountInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [readiness, setReadiness] = useState<ImportReadiness | null>(null)
  const [lastRun, setLastRun] = useState<ImportRunSummary | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [disconnectNotice, setDisconnectNotice] = useState<string | null>(null)

  useEffect(() => {
    api
      .audibleAccount()
      .then(setAccount)
      .catch((err) => setLoadError(String(err)))
    // Best-effort: if this fails, the import request still reports the reason.
    api
      .importReadiness()
      .then(setReadiness)
      .catch(() => setReadiness(null))
    api
      .listImports()
      .then((runs) => setLastRun(runs[0] ?? null))
      .catch(() => setLastRun(null))
  }, [])

  const { data: run } = usePolling<ImportRunDetail | null>(() => api.currentImport())
  const isRunning = run != null && run.status === 'running'

  const trigger = async () => {
    setTriggering(true)
    setTriggerError(null)
    try {
      await api.triggerImport()
      window.location.reload()
    } catch (err) {
      setTriggerError(err instanceof ApiError ? err.message : 'Could not start the import.')
    } finally {
      setTriggering(false)
    }
  }

  const disconnect = async () => {
    const ok = window.confirm(
      'Disconnect your Audible account?\n\n' +
        'This removes the saved Amazon login from this app and signs this app out of your Amazon account. ' +
        'Books already imported stay in Audiobookshelf. You can connect again at any time.',
    )
    if (!ok) return
    setDisconnecting(true)
    setDisconnectError(null)
    try {
      const result = await api.disconnectAudible()
      setDisconnectNotice(
        result.amazon_device_removed
          ? null
          : "Disconnected here, but Amazon couldn't be reached to sign this app out. You can remove it " +
              'yourself under Manage Your Content and Devices → Devices on amazon.com.',
      )
      setAccount(await api.audibleAccount())
    } catch (err) {
      setDisconnectError(err instanceof ApiError ? err.message : 'Could not disconnect.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loadError) return <p className="error">{loadError}</p>
  if (!account) return <p className="muted">Loading…</p>

  if (!account.connected) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        {disconnectNotice && <p className="error">{disconnectNotice}</p>}
        <p>Your Audible account isn't connected yet.</p>
        <button onClick={() => navigate('/connect-audible')}>Connect Audible Account</button>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Audible account connected ({account.marketplace}) — <StatusBadge status={account.status ?? 'active'} />
        {account.status === 'needs_reconnect' && (
          <>
            {' '}
            <Link to="/connect-audible">Reconnect</Link>
          </>
        )}
      </p>

      {isRunning ? (
        <div className="card">
          <h2>Import in progress</h2>
          <RunStatusTable items={run.items} />
        </div>
      ) : (
        <div className="card">
          {readiness && !readiness.ready && <p className="error">{readiness.reason}</p>}
          <h2>Sync library</h2>
          <p className="muted">
            Imports any Audible books that aren't in Audiobookshelf yet and retries ones that failed. Books that
            already imported are skipped, so it's safe to run again whenever you buy something new.
          </p>
          {lastRun && (
            <p className="muted">
              Last sync: <StatusBadge status={lastRun.status} /> {new Date(lastRun.requested_at).toLocaleString()}
              {lastRun.total_items != null && <> · {lastRun.total_items} books</>} ·{' '}
              <Link to={`/runs/${lastRun.id}`}>details</Link>
            </p>
          )}
          <button
            onClick={trigger}
            disabled={triggering || account.status === 'needs_reconnect' || readiness?.ready === false}
          >
            {triggering ? 'Starting…' : lastRun ? 'Sync again' : 'Sync library'}
          </button>
          {triggerError && <p className="error">{triggerError}</p>}
        </div>
      )}

      <div className="card">
        <h2>Audible account</h2>
        <p className="muted">
          Disconnecting removes the saved Amazon login and signs this app out of your Amazon account. Imported
          books stay in Audiobookshelf.
        </p>
        <button className="secondary" onClick={disconnect} disabled={disconnecting || isRunning}>
          {disconnecting ? 'Disconnecting…' : 'Disconnect Audible'}
        </button>
        {isRunning && <p className="muted">Available once the current import finishes.</p>}
        {disconnectError && <p className="error">{disconnectError}</p>}
      </div>

      <p>
        <Link to="/runs">View import history</Link>
      </p>
    </div>
  )
}
