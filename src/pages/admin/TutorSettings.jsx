import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function TutorSettings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api('/admin/settings/app').then(setS); }, []);
  if (!s) return <p className="muted">Loading…</p>;
  const f = (k) => (e) => setS({ ...s, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { setS(await api('/admin/settings/app', { method: 'PUT', body: s })); setMsg('Saved ✓'); } catch (ex) { setErr(ex.message); }
  }

  return (
    <>
      <h1>Tutor & limits</h1>
      <form className="card form" onSubmit={save}>
        <label>App name<input value={s.app_name} onChange={f('app_name')} /></label>
        <label>Tutor personality & teaching method (system prompt)
          <textarea rows={16} className="mono" value={s.tutor_base_prompt} onChange={f('tutor_base_prompt')} />
          <span className="small muted">Course and lesson details (phrases, vocabulary, role-play) are added automatically after this. Clear the box and save to restore the default.</span>
        </label>
        <div className="grid3">
          <label>Guest session length (min)<input type="number" min={1} value={s.guest_session_minutes} onChange={f('guest_session_minutes')} /></label>
          <label>Guest sessions per day<input type="number" min={0} value={s.guest_daily_sessions} onChange={f('guest_daily_sessions')} /></label>
          <label>Signed-in session length (min)<input type="number" min={1} value={s.user_session_minutes} onChange={f('user_session_minutes')} /></label>
        </div>
        <h3>Engagement & reminders</h3>
        <label>Public app URL (used in reminder emails)<input placeholder="https://kathai.app" value={s.app_url || ''} onChange={f('app_url')} /></label>
        <label className="inline check"><input type="checkbox" checked={String(s.reminders_enabled) === 'true'} onChange={(e) => setS({ ...s, reminders_enabled: e.target.checked ? 'true' : 'false' })} /> Send daily streak reminder emails to signed-in learners at their chosen time</label>
        {err && <div className="alert error">{err}</div>}
        <div className="row gap"><button className="btn">Save</button>{msg && <span className="ok">{msg}</span>}</div>
      </form>
    </>
  );
}
