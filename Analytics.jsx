import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell
} from 'recharts'
import { api, DEPT_COLORS, DAYS } from '../utils/api.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass" style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#94a3b8' }}>{p.name}: {p.value}{p.name?.includes('%') ? '%' : ''}</div>
      ))}
    </div>
  )
}

function Heatmap({ data }) {
  const hours = []
  for (let h = 6; h <= 20; h++) hours.push(h)

  const getCell = (day, hour) => data.find(d => d.day_of_week === day && d.hour === hour)

  const opacity = (pct) => {
    if (pct === 0) return 'rgba(139,92,246,0.05)'
    if (pct < 0.25) return 'rgba(139,92,246,0.2)'
    if (pct < 0.5) return 'rgba(139,92,246,0.45)'
    if (pct < 0.75) return 'rgba(139,92,246,0.7)'
    return 'rgba(139,92,246,0.95)'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 600 }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 40, marginBottom: 4 }}>
          {hours.map(h => (
            <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#475569' }}>
              {h}:00
            </div>
          ))}
        </div>
        {/* Grid */}
        {DAYS.map((day, di) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <div style={{ width: 36, fontSize: 11, color: '#64748b', textAlign: 'right', paddingRight: 6 }}>{day}</div>
            {hours.map(h => {
              const cell = getCell(di, h)
              return (
                <div key={h} className="heatmap-cell" title={`${day} ${h}:00 — ${cell?.count || 0} check-ins`}
                  style={{ flex: 1, height: 28, background: opacity(cell?.percentage || 0), borderRadius: 4 }} />
              )
            })}
          </div>
        ))}
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginLeft: 40, fontSize: 11, color: '#475569' }}>
          <span>Low</span>
          {[0.05, 0.2, 0.45, 0.7, 0.95].map((o, i) => (
            <div key={i} style={{ width: 20, height: 14, borderRadius: 3, background: `rgba(139,92,246,${o})` }} />
          ))}
          <span>High</span>
        </div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [heatmap, setHeatmap] = useState([])
  const [deptStats, setDeptStats] = useState([])
  const [trend, setTrend] = useState([])

  useEffect(() => {
    api.get('/heatmap').then(setHeatmap).catch(() => {})
    api.get('/dept-stats').then(setDeptStats).catch(() => {})
    api.get('/trend').then(setTrend).catch(() => {})
  }, [])

  const radarData = deptStats.map(d => ({
    subject: d.department.substring(0, 4),
    rate: d.attendance_rate,
    hours: d.avg_hours * 10
  }))

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Deep-dive into attendance patterns and workforce insights</p>
      </div>

      {/* Heatmap */}
      <div className="glass" style={{ borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Check-in Activity Heatmap</div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>When employees arrive — last 4 weeks</div>
        <Heatmap data={heatmap} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Dept bar chart */}
        <div className="glass" style={{ borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Department Attendance Rate</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Today's rate by department</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptStats} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="attendance_rate" name="Rate %" radius={[4, 4, 0, 0]}>
                {deptStats.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend bar */}
        <div className="glass" style={{ borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Attendance Rate Trend</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Daily attendance % over 2 weeks</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="attendance_rate" name="Attendance %" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dept table */}
      <div className="glass" style={{ borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Department Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Total Employees</th>
              <th>Present Today</th>
              <th>Attendance Rate</th>
              <th>Avg Hours Worked</th>
            </tr>
          </thead>
          <tbody>
            {deptStats.map(d => (
              <tr key={d.department}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                    <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{d.department}</span>
                  </div>
                </td>
                <td>{d.total}</td>
                <td>{d.present}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, minWidth: 80 }}>
                      <div style={{ height: '100%', width: `${d.attendance_rate}%`, background: d.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ color: d.color, fontWeight: 600 }}>{d.attendance_rate}%</span>
                  </div>
                </td>
                <td>{d.avg_hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
