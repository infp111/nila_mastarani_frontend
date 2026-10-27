import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, guestId } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const value = {
    user, loading,
    requestSignup: (name, email) => api('/auth/signup', { method: 'POST', body: { name, email } }),
    requestLogin: (email) => api('/auth/login', { method: 'POST', body: { email } }),
    verify: async (email, code, purpose) => {
      const d = await api('/auth/verify', { method: 'POST', body: { email, code, purpose, guestId: guestId() } });
      setToken(d.token); setUser(d.user); return d.user;
    },
    adminLogin: async (email, password) => {
      const d = await api('/auth/admin-login', { method: 'POST', body: { email, password } });
      setToken(d.token); setUser(d.user); return d.user;
    },
    updateName: async (name) => { const d = await api('/auth/me', { method: 'PATCH', body: { name } }); setUser(d.user); },
    logout: () => { setToken(null); setUser(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
