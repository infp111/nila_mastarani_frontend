import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useEngage, GOALS, scheduleDeviceReminder } from '../engage.jsx';

function Preferences({ stats, refresh, signedIn }) {
  const [goal, setGoal] = useState(stats.dailyGoal);
  const [on, setOn] = useState(stats.reminderEnabled);
  const [time, setTime] = useState(stats.reminderTime);
  const [msg, setMsg] = useState('');
  async function save(e) {
    e.preventDefault();
    await api('/me/preferences', { method: 'PUT', body: { dailyGoal: Number(goal), reminderEnabled: on, reminderTime: time } });
    const r = await scheduleDeviceReminder(on, time, stats.streak).catch(() => 'off');
    setMsg(r === 'denied' ? 'Saved. Notifications are blocked on this device.' : 'Saved ✓'); refresh();
  }
  return (
    <form className="card form" onSubmit={save}>
      <label>Daily goal
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>{GOALS.map((g) => <option key={g.xp} value={g.xp}>{g.label}: {g.xp} XP (~{g.min} min)</option>)}</select>
      </label>
      <label className="inline check"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Daily practice reminder</label>
      {on && <label>Reminder time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>}
      <p className="small muted">{signedIn ? 'You get an email reminder if you haven\'t practised by this time, plus a phone notification in the Android app.' : 'Sign in to also get email reminders.'}</p>
      <div className="row gap"><button className="btn">Save</button>{msg && <span className="small ok">{msg}</span>}</div>
    </form>
  );
}

export default function Profile() {
  const { user, logout, updateName } = useAuth();
  const nav = useNavigate();
  const [h, setH] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const { data, refresh } = useEngage();
  const st = data?.stats;

  useEffect(() => { api('/me/history').then(setH).catch(() => {}); }, [user]);
  useEffect(() => { setName(user?.name || ''); }, [user]);

  return (
    <main className="container narrow">
      <h1>{user ? `Hi, ${user.name}` : 'Your progress (guest)'}</h1>
      {!user && <div className="alert info">You're using Kathai as a guest. <Link to="/signin">Sign up free</Link> to keep your progress on any device.</div>}
      {st && (
        <div className="stats">
          <div className="card stat"><b>🔥 {st.streak}</b><span>day streak</span></div>
          <div className="card stat"><b>🏅 {st.streakBest}</b><span>best streak</span></div>
          <div className="card stat"><b>⚡ {st.xpTotal}</b><span>total XP</span></div>
          <div className="card stat"><b>🧊 {st.freezes}</b><span>streak freezes</span></div>
          <div className="card stat"><b>{st.lessonsDone}</b><span>lessons done</span></div>
          {h && <div className="card stat"><b>{h.minutesPractised}</b><span>minutes spoken</span></div>}
        </div>
      )}
      {data && (
        <>
          <h3>Achievements · {data.achievements.filter((a) => a.earned).length}/{data.achievements.length}</h3>
          <div className="badges">
            {data.achievements.map((a) => (
              <div key={a.code} className={`badge ${a.earned ? 'earned' : ''}`} title={a.desc}><span>{a.icon}</span><b>{a.title}</b><small>{a.desc}</small></div>
            ))}
          </div>
          <p className="small muted">Every 7-day streak earns a streak freeze (max 2). A freeze protects your streak on a day you miss.</p>
          <h3>Goal & reminders</h3>
          <Preferences key={`${st.dailyGoal}${st.reminderTime}${st.reminderEnabled}`} stats={st} refresh={refresh} signedIn={Boolean(user)} />
        </>
      )}
      <h3>Recent practice</h3>
      <div className="card">
        {h?.sessions.length ? h.sessions.map((s) => (
          <div key={s.id} className="row between list-row">
            <span>{s.lesson_title || 'Free conversation'}</span>
            <span className="muted small">{new Date(s.started_at).toLocaleString()} · {Math.round(s.seconds / 60)} min</span>
          </div>
        )) : <p className="muted">No sessions yet. <Link to="/practice">Start talking</Link></p>}
      </div>
      {user && (
        <>
          <h3>Account</h3>
          <form className="card form" onSubmit={async (e) => { e.preventDefault(); await updateName(name); setSaved(true); }}>
            <label>Name<input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} /></label>
            <label>Email<input value={user.email} disabled /></label>
            <div className="row gap">
              <button className="btn">{saved ? 'Saved ✓' : 'Save'}</button>
              {user.role === 'admin' && <Link to="/admin" className="btn btn-ghost">Admin panel</Link>}
              <button type="button" className="btn btn-ghost" onClick={() => { logout(); nav('/'); }}>Sign out</button>
            </div>
          </form>
        </>
      )}
    </main>
  );
}
