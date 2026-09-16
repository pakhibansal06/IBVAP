const API_BASE = import.meta.env.VITE_API_URL || '/api';
const STREAM_BASE = (typeof window !== 'undefined' && window.location.port === '5173')
  ? `http://${window.location.hostname}:8000/api`
  : API_BASE;
const TOKEN_KEY = 'ibvap_token';

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function clearToken() {
  setToken(null);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (e) {
    throw new ApiError(
      'Backend unreachable. Is the API server running on port 8000?',
      0,
      e
    );
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    let data = null;
    try {
      data = await res.json();
      if (typeof data.detail === 'string') detail = data.detail;
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) detail = data.detail[0].msg;
      else if (data.message) detail = data.message;
    } catch {
      /* non-JSON response */
    }
    throw new ApiError(detail, res.status, data);
  }

  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const query = new URLSearchParams(clean).toString();
  return query ? `?${query}` : '';
};

export const apiService = {
  // ------------------------------------------------------------------
  // Auth
  // ------------------------------------------------------------------
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }).then((data) => {
      setToken(data.access_token);
      return data;
    }),

  register: (payload) =>
    request('/auth/register', { method: 'POST', body: payload }),

  me: () => request('/auth/me'),

  verifyToken: (token) =>
    request(`/auth/verify-token?token=${encodeURIComponent(token)}`),

  logout: () => clearToken(),

  // ------------------------------------------------------------------
  // Cameras
  // ------------------------------------------------------------------
  getCameras: (params = {}) => request(`/cameras${qs(params)}`),

  getCamera: (code) => request(`/cameras/${encodeURIComponent(code)}`),

  createCamera: (payload) =>
    request('/cameras', { method: 'POST', body: payload }),

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------
  getEvents: (params = {}) => request(`/events${qs(params)}`),

  // ------------------------------------------------------------------
  // Alerts
  // ------------------------------------------------------------------
  getAlerts: (params = {}) => request(`/alerts${qs(params)}`),

  getAlert: (id) => request(`/alerts/${id}`),

  updateAlertStatus: (alertId, status, notes = '') =>
    request(`/alerts/${alertId}/status`, {
      method: 'PATCH',
      body: { status, notes }
    }),

  // ------------------------------------------------------------------
  // Incidents
  // ------------------------------------------------------------------
  getIncidentActions: (alertId) => request(`/incidents/${alertId}/actions`),

  recordIncidentAction: (alertId, actionType, notes = '') =>
    request(`/incidents/${alertId}/actions`, {
      method: 'POST',
      body: { action_type: actionType, notes }
    }),

  // ------------------------------------------------------------------
  // Analytics
  // ------------------------------------------------------------------
  getAnalyticsSummary: () => request('/analytics/summary'),

  // ------------------------------------------------------------------
  // Tracked objects & plates
  // ------------------------------------------------------------------
  getTrackedObjects: (params = {}) => request(`/tracked${qs(params)}`),

  getTrackedObject: (trackingId) =>
    request(`/tracked/${encodeURIComponent(trackingId)}`),

  getPlates: (params = {}) => request(`/plates${qs(params)}`),

  // ------------------------------------------------------------------
  // Demo / dataset seeding
  // ------------------------------------------------------------------
  triggerDemoScenario: (scenarioType) =>
    request(`/demo/trigger?scenario=${encodeURIComponent(scenarioType)}`, {
      method: 'POST'
    }),

  seedDatasets: () => request('/demo/seed', { method: 'POST' }),

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  getNotifications: (params = {}) => request(`/notifications${qs(params)}`),

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  streamUrl: (cameraCode) => `${STREAM_BASE}/stream/${encodeURIComponent(cameraCode)}`,
  frameUrl: (cameraCode) => `${STREAM_BASE}/stream/${encodeURIComponent(cameraCode)}/frame`
};