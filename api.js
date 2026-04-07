const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'

export const api = {
  get: (path) => fetch(`${BASE}${path}`).then(r => r.json()),
  post: (path, body) => fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()),
}

export { WS_URL }

export const DEPT_COLORS = {
  Engineering: '#7F77DD',
  Design: '#1D9E75',
  Marketing: '#D85A30',
  HR: '#D4537E',
  Finance: '#378ADD',
  Operations: '#BA7517',
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
