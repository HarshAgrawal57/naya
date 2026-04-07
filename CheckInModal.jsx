import { useState, useEffect } from 'react'
import { X, Clock, MapPin, User, Fingerprint, CreditCard, Navigation, Edit3, CheckCircle } from 'lucide-react'
import { api } from '../utils/api.js'

export default function CheckInModal({ onClose }) {
  const [employees, setEmployees] = useState([])
  const [empId, setEmpId] = useState('')
  const [method, setMethod] = useState('badge')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')
  const [location, setLocation] = useState({ lat: 18.5204, lng: 73.8567 })
  const [todayRecord, setTodayRecord] = useState(null)

  useEffect(() => {
    api.get('/employees').then(setEmployees).catch(() => {})
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      }, () => {})
    }
  }, [])

  useEffect(() => {
    if (!empId) { setTodayRecord(null); return }
    api.get(`/records?date=${new Date().toISOString().split('T')[0]}&emp_id=${empId}`)
      .then(recs => setTodayRecord(recs?.[0] || null))
      .catch(() => {})
  }, [empId])

  const handleCheckIn = async () => {
    if (!empId) { setError('Please select an employee'); return }
    setLoading(true); setError('')
    try {
      const rec = await api.post('/checkin', { employee_id: empId, method, lat: location.lat, lng: location.lng, notes })
      setSuccess({ type: 'in', record: rec })
    } catch (e) {
      setError('Check-in failed. Try again.')
    }
    setLoading(false)
  }

  const handleCheckOut = async () => {
    if (!todayRecord) { setError('No active check-in found'); return }
    setLoading(true); setError('')
    try {
      const rec = await api.post(`/checkout/${todayRecord.id}`, {})
      setSuccess({ type: 'out', record: rec })
    } catch (e) {
      setError('Check-out failed. They may have already checked out.')
    }
    setLoading(false)
  }

  const methodOptions = [
    { value: 'face_id', icon: Fingerprint, label: 'Face ID' },
    { value: 'badge', icon: CreditCard, label: 'Badge' },
    { value: 'geo', icon: Navigation, label: 'Geo-fence' },
    { value: 'manual', icon: Edit3, label: 'Manual' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass fade-in" style={{ width: '100%', maxWidth: 460, borderRadius: 20, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Check In / Out</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#64748b' }}>
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="#4ade80" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
              {success.type === 'in' ? 'Checked In!' : 'Checked Out!'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
              {success.record.employee_name} · {new Date(success.type === 'in' ? success.record.check_in : success.record.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {success.record.status === 'late' && (
              <div style={{ marginTop: 12, padding: '8px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
                ⚠️ Late arrival recorded
              </div>
            )}
            <button className="btn-secondary" style={{ marginTop: 24 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            {/* Employee select */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 500 }}>Employee</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <select value={empId} onChange={e => setEmpId(e.target.value)} style={{ width: '100%', paddingLeft: 30 }}>
                  <option value="">Select employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {e.department}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Today status */}
            {empId && todayRecord && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, fontSize: 12 }}>
                <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: 2 }}>Today's record found</div>
                <div style={{ color: '#94a3b8' }}>
                  Checked in at {new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {todayRecord.check_out ? ` · Left at ${new Date(todayRecord.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ' · Still active'}
                </div>
              </div>
            )}

            {/* Method */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 500 }}>Check-in Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {methodOptions.map(({ value, icon: Icon, label }) => (
                  <button key={value} onClick={() => setMethod(value)}
                    style={{
                      padding: '10px 6px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                      background: method === value ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${method === value ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                    }}>
                    <Icon size={16} color={method === value ? '#c4b5fd' : '#64748b'} />
                    <span style={{ fontSize: 10, color: method === value ? '#c4b5fd' : '#64748b', fontWeight: 500 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 500 }}>Location</label>
              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} />
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 500 }}>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add a note..."
                rows={2} style={{ width: '100%', resize: 'none' }} />
            </div>

            {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#f87171', marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCheckIn} disabled={loading}>
                <Clock size={14} />
                {loading ? 'Processing...' : 'Check In'}
              </button>
              {todayRecord && !todayRecord.check_out && (
                <button className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCheckOut} disabled={loading}>
                  <Clock size={14} />
                  Check Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
