// Small client for the backend in API.md. Every helper rejects on network error,
// timeout, or a non-OK status, so callers can fall back to mockData.js.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const TIMEOUT_MS = 3000

async function request(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// POST /api/match, body { household } -> { results: [Match] }
export function getMatches(household) {
  return request('/api/match', { method: 'POST', body: JSON.stringify({ household }) })
}

// GET /api/schemes -> { schemes: [Scheme] }
export function getSchemes() {
  return request('/api/schemes')
}

// PUT /api/schemes/:id, body { rules, lastVerified } -> { scheme, newMessages: [Message] }
export function putScheme(id, body) {
  return request(`/api/schemes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
