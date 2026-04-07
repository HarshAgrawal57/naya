import { useState, useEffect, useRef } from 'react'
import { MapPin, Users, RefreshCw } from 'lucide-react'
import { api, DEPT_COLORS } from '../utils/api.js'

export default function LiveMap() {
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    const data = await api.get('/live-map').catch(() => [])
    setEmployees(data || [])
    setTimeout(() => setRefreshing(false), 500)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  // Pune bounding box for map
  const bounds = { minLat: 18.49, maxLat: 18.55, minLng: 73.83, maxLng: 73.88 }

  const toPos = (lat, lng, w, h) => ({
    x: ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * w,
    y: h - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * h
  })

  const filtered = employees.filter(e => filter === 'all' || e.status === filter)

  const statusColor = { present: '#4ade80', late: '#fbbf24', absent: '#f87171' }
  const stats = {
    present: employees.filter(e => e.status === 'present').length,
    late: employees.filter(e => e.status === 'late').length,
    absent: employees.filter(e => e.status === 'absent').length,
  }

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Live Map</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Real-time employee location tracking</p>
        </div>
        <button className="btn-secondary" onClick={load} style={{ gap: 6 }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.5s linear' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {Object.entries(stats).map(([s, n]) => (
          <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
            style={{
              background: filter === s ? `${statusColor[s]}15` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === s ? statusColor[s] + '44' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[s] }} />
              <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{s}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: statusColor[s] }}>{n}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Map */}
        <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', minHeight: 500 }}>
          {/* Map background - simple grid */}
          <div style={{ position: 'relative', width: '100%', height: 500, background: '#0d1020' }}>
            {/* Grid lines */}
            {[...Array(10)].map((_, i) => (
              <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 10}%`, height: 1, background: 'rgba(255,255,255,0.03)' }} />
            ))}
            {[...Array(10)].map((_, i) => (
              <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * 10}%`, width: 1, background: 'rgba(255,255,255,0.03)' }} />
            ))}

            {/* HQ marker */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
              <div style={{ background: 'rgba(124,58,237,0.3)', border: '2px solid #7c3aed', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#c4b5fd', whiteSpace: 'nowrap' }}>
                🏢 Headquarters
              </div>
            </div>

            {/* Employee dots */}
            {filtered.map(emp => {
              const pos = toPos(emp.lat, emp.lng, 100, 100)
              const color = statusColor[emp.status] || '#94a3b8'
              const deptColor = DEPT_COLORS[emp.department] || '#7F77DD'
              return (
                <div key={emp.id}
                  onClick={() => setSelected(selected?.id === emp.id ? null : emp)}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    width: 12, height: 12, borderRadius: '50%',
                    background: color,
                    border: `2px solid ${selected?.id === emp.id ? 'white' : 'rgba(0,0,0,0.5)'}`,
                    transform: 'translate(-50%,-50%)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: selected?.id === emp.id ? 10 : 1,
                    boxShadow: `0 0 8px ${color}88`
                  }}
                  title={`${emp.name} — ${emp.status}`}
                />
              )
            })}

            {/* Selected tooltip */}
            {selected && (() => {
              const pos = toPos(selected.lat, selected.lng, 100, 100)
              const adjustedLeft = Math.min(Math.max(pos.x, 15), 75)
              const adjustedTop = pos.y > 70 ? pos.y - 20 : pos.y + 5
              return (
                <div className="glass" style={{
                  position: 'absolute',
                  left: `${adjustedLeft}%`, top: `${adjustedTop}%`,
                  borderRadius: 10, padding: '10px 14px', fontSize: 12,
                  minWidth: 160, zIndex: 20, transform: 'translateX(-50%)',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{selected.name}</div>
                  <div style={{ color: DEPT_COLORS[selected.department], fontSize: 11 }}>{selected.department}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge badge-${selected.status}`}>{selected.status}</span>
                    {selected.check_in_at && <span style={{ color: '#64748b' }}>In: {selected.check_in_at}</span>}
                  </div>
                </div>
              )
            })()}

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 12 }}>
              {Object.entries(statusColor).map(([s, c]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar list */}
        <div className="glass" style={{ borderRadius: 14, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>
            <Users size={14} style={{ display: 'inline', marginRight: 6 }} />
            {filtered.length} employees {filter !== 'all' ? `(${filter})` : ''}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.slice(0, 25).map(emp => (
              <div key={emp.id} onClick={() => setSelected(selected?.id === emp.id ? null : emp)}
                className="slide-in"
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                  background: selected?.id === emp.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selected?.id === emp.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)'}`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[emp.status], flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 500 }}>{emp.name}</span>
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2, paddingLeft: 14 }}>
                  {emp.department}{emp.check_in_at ? ` · In ${emp.check_in_at}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
