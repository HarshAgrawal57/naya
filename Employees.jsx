import { useState, useEffect } from 'react'
import { Search, Filter, Mail, Briefcase } from 'lucide-react'
import { api, DEPT_COLORS } from '../utils/api.js'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [records, setRecords] = useState({})

  useEffect(() => {
    api.get('/employees').then(setEmployees).catch(() => {})
    api.get('/records').then(recs => {
      const map = {}
      recs.forEach(r => { map[r.employee_id] = r })
      setRecords(map)
    }).catch(() => {})
  }, [])

  const depts = ['', ...new Set(employees.map(e => e.department))]
  const filtered = employees.filter(e =>
    (dept === '' || e.department === dept) &&
    (search === '' || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Employees</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{employees.length} total employees registered</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: '100%', paddingLeft: 34 }} />
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)} style={{ minWidth: 160 }}>
          {depts.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(emp => {
          const rec = records[emp.id]
          const isPresent = !!rec
          const deptColor = DEPT_COLORS[emp.department] || '#7F77DD'
          const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)

          return (
            <div key={emp.id} className="glass fade-in" style={{ borderRadius: 14, padding: 18, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `${deptColor}22`, border: `2px solid ${deptColor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: deptColor, flexShrink: 0
                }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{emp.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div className="pulse-dot" style={{ background: isPresent ? '#4ade80' : '#f87171' }} />
                      <span style={{ fontSize: 11, color: isPresent ? '#4ade80' : '#f87171' }}>{isPresent ? 'In' : 'Out'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{emp.role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: `${deptColor}18`, color: deptColor, fontWeight: 500
                    }}>{emp.department}</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                  <Mail size={12} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                </div>
                {rec && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>In: <span style={{ color: '#4ade80' }}>{new Date(rec.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></span>
                    {rec.check_out && <span style={{ color: '#94a3b8' }}>Out: <span style={{ color: '#60a5fa' }}>{new Date(rec.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></span>}
                    <span className={`badge badge-${rec.status}`}>{rec.status}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#475569', padding: 60, fontSize: 14 }}>No employees found</div>
      )}
    </div>
  )
}
