import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Clock, Bell, BarChart3, Map, Settings, Zap, ChevronRight, X } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employees.jsx'
import Records from './pages/Records.jsx'
import Analytics from './pages/Analytics.jsx'
import LiveMap from './pages/LiveMap.jsx'
import CheckInModal from './components/CheckInModal.jsx'
import { api, WS_URL } from './utils/api.js'

function Sidebar({ onCheckIn, alertCount }) {
  const location = useLocation()
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/records', icon: Clock, label: 'Attendance' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/live-map', icon: Map, label: 'Live Map' },
  ]
  return (
    <aside style={{
      width: 220, minWidth: 220, background: '#0d1020',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0
    }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.3px' }}>AttendIQ</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Workforce Monitor</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
              color: isActive ? '#c4b5fd' : '#64748b',
              background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
              transition: 'all 0.15s',
            })}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
          onClick={onCheckIn}>
          <Clock size={15} />
          Check In / Out
        </button>
      </div>
    </aside>
  )
}

function TopBar({ alerts, onAlertRead }) {
  const [showAlerts, setShowAlerts] = useState(false)
  const unread = alerts.filter(a => !a.Read).length

  const severityColor = { critical: '#f87171', warning: '#fbbf24', info: '#60a5fa' }

  return (
    <header style={{
      height: 56, background: '#0d1020', borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', position: 'sticky', top: 0, zIndex: 40
    }}>
      <div style={{ fontSize: 13, color: '#475569' }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <button className="btn-secondary" style={{ padding: '7px 10px', position: 'relative' }}
            onClick={() => setShowAlerts(!showAlerts)}>
            <Bell size={16} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                background: '#ef4444', borderRadius: '50%', fontSize: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700
              }}>{unread}</span>
            )}
          </button>
          {showAlerts && (
            <div className="glass fade-in" style={{
              position: 'absolute', right: 0, top: 44, width: 340, borderRadius: 12,
              zIndex: 100, maxHeight: 400, overflowY: 'auto'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Alerts</span>
                <button onClick={() => setShowAlerts(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              {alerts.slice(0, 8).map(a => (
                <div key={a.id} onClick={() => onAlertRead(a.id)} style={{
                  padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', opacity: a.Read ? 0.5 : 1,
                  background: a.Read ? 'transparent' : 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: severityColor[a.Severity] || '#94a3b8', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: '#cbd5e1', flex: 1 }}>{a.Message}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, paddingLeft: 14 }}>{a.Employee} · {new Date(a.Timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              {alerts.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#475569', fontSize: 13 }}>No alerts</div>}
            </div>
          )}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'white' }}>
          AD
        </div>
      </div>
    </header>
  )
}

function LiveNotification({ notification, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [notification])

  if (!notification) return null
  return (
    <div className="notification-enter glass" style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      padding: '12px 16px', borderRadius: 12, maxWidth: 320,
      display: 'flex', alignItems: 'flex-start', gap: 10,
      borderLeft: '3px solid #4ade80'
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', marginTop: 4, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Live Check-in</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{notification.message}</div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', marginLeft: 'auto' }}><X size={14} /></button>
    </div>
  )
}

function AppInner() {
  const [alerts, setAlerts] = useState([])
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [liveNotif, setLiveNotif] = useState(null)

  useEffect(() => {
    api.get('/alerts').then(setAlerts).catch(() => {})
  }, [])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'alert') {
          setAlerts(prev => [msg.alert, ...prev])
        }
        if (msg.type === 'live_checkin') {
          setLiveNotif(msg)
        }
      } catch {}
    }
    return () => ws.close()
  }, [])

  const handleAlertRead = useCallback((id) => {
    api.post(`/alerts/${id}/read`, {}).catch(() => {})
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, Read: true } : a))
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onCheckIn={() => setShowCheckIn(true)} alertCount={alerts.filter(a => !a.Read).length} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar alerts={alerts} onAlertRead={handleAlertRead} />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/records" element={<Records />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/live-map" element={<LiveMap />} />
          </Routes>
        </main>
      </div>
      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
      <LiveNotification notification={liveNotif} onClose={() => setLiveNotif(null)} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
