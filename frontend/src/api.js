import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
});

/**
 * Turns an axios failure into a single readable sentence. The API returns
 * `{ error, details? }`, where `details` carries Zod field issues.
 */
export function describeError(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;
  if (!data) {
    if (error?.code === 'ECONNABORTED') return 'The request timed out. Is the API running?';
    if (error?.message === 'Network Error') {
      return 'Cannot reach the API. Start the backend with "npm run dev" in backend/.';
    }
    return error?.message ?? fallback;
  }
  if (Array.isArray(data.details) && data.details.length > 0) {
    const issues = data.details
      .slice(0, 3)
      .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
      .join('; ');
    return `${data.error} — ${issues}`;
  }
  return data.error ?? fallback;
}

export const waylinesApi = {
  list: () => http.get('/waylines').then((r) => r.data),
  get: (id) => http.get(`/waylines/${id}`).then((r) => r.data),
  create: (payload) => http.post('/waylines', payload).then((r) => r.data),
  update: (id, payload) => http.put(`/waylines/${id}`, payload).then((r) => r.data),
  remove: (id) => http.delete(`/waylines/${id}`).then((r) => r.data),
};

export const dronesApi = {
  list: () => http.get('/drones').then((r) => r.data),
  create: (payload) => http.post('/drones', payload).then((r) => r.data),
};

export const assignmentsApi = {
  list: () => http.get('/assignments').then((r) => r.data),
  create: (waylineId, droneIds) =>
    http.post('/assignments', { wayline_id: waylineId, drone_ids: droneIds }).then((r) => r.data),
  setStatus: (id, status) => http.patch(`/assignments/${id}`, { status }).then((r) => r.data),
  remove: (id) => http.delete(`/assignments/${id}`).then((r) => r.data),
};
