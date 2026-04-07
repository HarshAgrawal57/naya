import { useState, useEffect } from 'react'
import { Search, Download, Calendar } from 'lucide-react'
import { api } from '../utils/api.js'

export default function Records() {
  const [records, setRecords] = useState([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    api.get(`/records?date=${date}`).then(setRecords).catch(() => {})
  }, [date])

  const filtered = records.filter(r =>
    (statusFilter === '' || r.status === statusFilter) &&
    (search === '' || r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase()))
  )

  const exportCSV = () => {
    const headers = ['Employee', 'Department', 'Check In', 'Check Out', 'Hours', 'Status', 'Method', 'Location']
    const rows = filtered.map(r => [
      r.employee_name, r.department,
      new Date(r.check_in).toLocaleTimeString('en-IN'),
      r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN') : '',
      r.duration_hours, r.status, r.method, r.location
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `attendance_${date}.csv`
    a.click()
  }

  const summary = {
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    active: records.filter(r => !r.check_out).length,
  }

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Attendance Records</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{filtered.length} records for selected date</p>
        </div>
        <button className="btn-secondary" onClick={exportCSV}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'On Time', val: summary.present, color: '#4ade80' },
          { label: 'Late', val: summary.late, color: '#fbbf24' },
          { label: 'Still Active', val: summary.active, color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Calendar size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." style={{ width: '100%', paddingLeft: 30 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Method</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500, color: '#f1f5f9' }}>{r.employee_name}</td>
                  <td>{r.department}</td>
                  <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                    {new Date(r.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                    {r.check_out
                      ? new Date(r.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : <span style={{ color: '#4ade80', fontSize: 12 }}>● Working</span>}
                  </td>
                  <td>{r.duration_hours > 0 ? `${r.duration_hours}h` : '—'}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td><span className={`badge badge-${r.method}`}>{r.method}</span></td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{r.location}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No records for this date</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
