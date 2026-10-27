import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await adminLogin(email, password); nav('/admin'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <main className="container auth">
      <form className="card auth-card form" onSubmit={submit}>
        <h2>Kathai Admin</h2>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <div className="alert error">{err}</div>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
