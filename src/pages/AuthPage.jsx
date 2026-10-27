import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// One screen for both: sign up (name + email) and sign in (email). Both finish with a 6-digit email OTP.
export default function AuthPage() {
  const { requestSignup, requestLogin, verify } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('signup');
  const [step, setStep] = useState('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      const d = mode === 'signup' ? await requestSignup(name, email) : await requestLogin(email);
      setMsg(d.message); setStep('otp');
    } catch (ex) {
      setErr(ex.message);
      if (ex.code === 'EXISTS') setMode('login');
      if (ex.code === 'NOT_FOUND') setMode('signup');
    } finally { setBusy(false); }
  }

  async function confirm(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await verify(email, code, mode); nav('/'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  async function resend() {
    setErr(''); setMsg('');
    try { const d = mode === 'signup' ? await requestSignup(name, email) : await requestLogin(email); setMsg(d.message); }
    catch (ex) { setErr(ex.message); }
  }

  return (
    <main className="container auth">
      <div className="card auth-card">
        {step === 'form' ? (
          <>
            <div className="tabs">
              <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
              <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
            </div>
            <h2>{mode === 'signup' ? 'Create your free account' : 'Welcome back'}</h2>
            <p className="muted small">{mode === 'signup' ? 'Just your name and email. No password needed.' : "We'll email you a 6-digit code."}</p>
            <form onSubmit={submit} className="form">
              {mode === 'signup' && (
                <label>Your name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Suresh Kumar" autoComplete="name" /></label>
              )}
              <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" /></label>
              {err && <div className="alert error">{err}</div>}
              <button className="btn btn-block" disabled={busy}>{busy ? 'Sending code…' : 'Send code'}</button>
            </form>
          </>
        ) : (
          <>
            <h2>Check your email 📩</h2>
            <p className="muted small">{msg || 'We sent a code'} to <strong>{email}</strong></p>
            <form onSubmit={confirm} className="form">
              <input className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" autoFocus />
              {err && <div className="alert error">{err}</div>}
              <button className="btn btn-block" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : mode === 'signup' ? 'Confirm & create account' : 'Sign in'}</button>
            </form>
            <div className="row between small">
              <button className="link" onClick={() => { setStep('form'); setCode(''); }}>← Change email</button>
              <button className="link" onClick={resend}>Resend code</button>
            </div>
          </>
        )}
        <p className="small muted center-text">You can also <Link to="/practice">keep learning as a guest</Link>.</p>
      </div>
    </main>
  );
}
