import { useState, useEffect } from 'react'
import { Users, Clock, UserCheck, UserX, TrendingUp, AlertTriangle, Timer, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { api } from '../utils/api.js'

function StatCard({ icon: Icon, label, value, sub, color, glow }) {
  const colorMap = {
    green: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', icon: '#4ade80', val: '#4ade80' },
    purple: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', icon: '#c4b5fd', val: '#c4b5fd' },
    amber: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '#fbbf24', val: '#fbbf24' },
    red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: '#f87171', val: '#f87171' },
    blue: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', icon: '#60a5fa', val: '#60a5fa' },
    teal: { bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)', icon: '#2dd4bf', val: '#2dd4bf' },
  }
  const c = colorMap[color] || colorMap.purple

  return (
    <div className="fade-in" style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={c.icon} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: c.val, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass" style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [deptStats, setDeptStats] = useState([])
  const [records, setRecords] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(setStats).catch(() => {})
    api.get('/trend').then(setTrend).catch(() => {})
    api.get('/dept-stats').then(setDeptStats).catch(() => {})
    api.get('/records').then(r => setRecords(r.slice(0, 8))).catch(() => {})

    const interval = setInterval(() => {
      api.get('/dashboard').then(setStats).catch(() => {})
      api.get('/records').then(r => setRecords(r.slice(0, 8))).catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ color: '#475569', fontSize: 14 }}>Loading dashboard...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Real-time workforce attendance overview</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon={Users} label="Total Employees" value={stats.total_employees} sub="Active workforce" color="purple" />
        <StatCard icon={UserCheck} label="Present Today" value={stats.present_today} sub={`${stats.attendance_rate}% attendance rate`} color="green" />
        <StatCard icon={UserX} label="Absent Today" value={stats.absent_today} sub={`${stats.on_leave} on approved leave`} color="red" />
        <StatCard icon={Clock} label="Late Arrivals" value={stats.late_today} sub="Arrived after 9:15 AM" color="amber" />
        <StatCard icon={Timer} label="Avg Check-in" value={stats.avg_check_in_time} sub="Today's average" color="blue" />
        <StatCard icon={Activity} label="Overtime" value={stats.overtime_count} sub="Working 9+ hours" color="teal" />
        <StatCard icon={AlertTriangle} label="Unread Alerts" value={stats.unread_alerts} sub="Needs attention" color="amber" />
        <StatCard icon={TrendingUp} label="Attendance Rate" value={`${stats.attendance_rate}%`} sub="Today's rate" color="green" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }}>
        {/* Trend chart */}
        <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Attendance Trend</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Last 10 working days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="present" name="Present" stroke="#4ade80" fill="url(#greenGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="late" name="Late" stroke="#fbbf24" fill="url(#amberGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Dept stats */}
        <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>By Department</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Today's attendance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {deptStats.map(d => (
              <div key={d.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>{d.department}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.attendance_rate}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.attendance_rate}%`, background: d.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{d.present}/{d.total} present · {d.avg_hours}h avg</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Recent Check-ins Today</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Method</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{r.employee_name}</td>
                  <td>{r.department}</td>
                  <td>{new Date(r.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span style={{ color: '#4ade80' }}>● Active</span>}</td>
                  <td>{r.check_out ? `${r.duration_hours}h` : '—'}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td><span className={`badge badge-${r.method}`}>{r.method}</span></td>
                  <td style={{ color: '#64748b' }}>{r.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
