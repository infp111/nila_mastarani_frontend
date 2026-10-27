// API client. Guests get a persistent anonymous id so they can learn without an account.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function guestId() {
  let id = localStorage.getItem('kathai_guest');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, '');
    localStorage.setItem('kathai_guest', id);
  }
  return id;
}

export const getToken = () => localStorage.getItem('kathai_token');
export const setToken = (t) => (t ? localStorage.setItem('kathai_token', t) : localStorage.removeItem('kathai_token'));

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Guest-Id': guestId() };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status; err.code = data.code;
    throw err;
  }
  return data;
}

export function voiceSocketUrl(lessonId) {
  const base = API || window.location.origin;
  const u = new URL('/ws/voice', base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  if (lessonId) u.searchParams.set('lessonId', lessonId);
  const t = getToken();
  if (t) u.searchParams.set('token', t);
  u.searchParams.set('guestId', guestId());
  return u.toString();
}
