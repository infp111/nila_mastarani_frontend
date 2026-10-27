import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const PRESETS = {
  Gmail: { smtp_host: 'smtp.gmail.com', smtp_port: '465', smtp_secure: 'true' },
  'Gmail (STARTTLS)': { smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_secure: 'false' },
  'Zoho Mail': { smtp_host: 'smtp.zoho.in', smtp_port: '465', smtp_secure: 'true' },
  'Outlook / Office 365': { smtp_host: 'smtp.office365.com', smtp_port: '587', smtp_secure: 'false' },
  'Amazon SES (Mumbai)': { smtp_host: 'email-smtp.ap-south-1.amazonaws.com', smtp_port: '465', smtp_secure: 'true' },
};

export default function MailSettings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [to, setTo] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => { api('/admin/settings/mail').then(setS); }, []);
  if (!s) return <p className="muted">Loading…</p>;
  const f = (k) => (e) => setS({ ...s, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { setS(await api('/admin/settings/mail', { method: 'PUT', body: s })); setMsg('Saved ✓'); } catch (ex) { setErr(ex.message); }
  }
  async function sendTest() {
    setErr(''); setMsg(''); setTesting(true);
    try { const d = await api('/admin/settings/mail/test', { method: 'POST', body: { to } }); setMsg(d.message); } catch (ex) { setErr(ex.message); } finally { setTesting(false); }
  }

  return (
    <>
      <h1>Mail settings</h1>
      <p className="muted small">Used to send sign-up and sign-in codes (OTP). For Gmail, turn on 2-Step Verification on the sender account, then create an App Password at myaccount.google.com/apppasswords and paste it below.</p>
      <form className="card form" onSubmit={save}>
        <div className="row gap wrap">
          <span className="small muted">Quick preset:</span>
          {Object.keys(PRESETS).map((k) => <button type="button" key={k} className="chip" onClick={() => setS({ ...s, ...PRESETS[k] })}>{k}</button>)}
        </div>
        <div className="grid2">
          <label>Sender email (From)<input type="email" required value={s.mail_from_email} onChange={f('mail_from_email')} /></label>
          <label>Sender name<input value={s.mail_from_name} onChange={f('mail_from_name')} /></label>
          <label>SMTP server<input required value={s.smtp_host} onChange={f('smtp_host')} /></label>
          <div className="grid2">
            <label>Port<input required value={s.smtp_port} onChange={f('smtp_port')} /></label>
            <label>Encryption
              <select value={s.smtp_secure} onChange={f('smtp_secure')}>
                <option value="true">SSL/TLS (465)</option>
                <option value="false">STARTTLS (587)</option>
              </select>
            </label>
          </div>
          <label>SMTP username<input required value={s.smtp_user} onChange={f('smtp_user')} autoComplete="off" /></label>
          <label>App password / SMTP password {s.smtp_pass_set && <span className="small muted">(saved {s.smtp_pass_hint}; leave blank to keep)</span>}
            <input type="password" value={s.smtp_pass} onChange={f('smtp_pass')} placeholder={s.smtp_pass_set ? '••••••••' : 'xxxx xxxx xxxx xxxx'} autoComplete="new-password" />
          </label>
        </div>
        <label>OTP email subject<input value={s.otp_subject} onChange={f('otp_subject')} /></label>
        {err && <div className="alert error">{err}</div>}
        {msg && <div className="alert ok-bg">{msg}</div>}
        <div className="row gap"><button className="btn">Save</button></div>
      </form>

      <h3>Send a test email</h3>
      <div className="card row gap wrap">
        <input type="email" placeholder="you@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn btn-ghost" onClick={sendTest} disabled={!to || testing}>{testing ? 'Sending…' : 'Send test'}</button>
        <span className="small muted">Save first, then test.</span>
      </div>
    </>
  );
}
