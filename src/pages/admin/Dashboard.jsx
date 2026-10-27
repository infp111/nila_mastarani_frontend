import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { api('/admin/stats').then(setS); }, []);
  if (!s) return <p className="muted">Loading…</p>;

  const view = async (id) => setOpen((await api(`/admin/sessions/${id}`)).session);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        {[['Users', s.users], ['Guests', s.guests], ['Courses', s.courses], ['Lessons', s.lessons], ['Sessions', s.sessions], ['Minutes spoken', s.minutes]].map(([k, v]) => (
          <div key={k} className="card stat"><b>{v}</b><span>{k}</span></div>
        ))}
      </div>
      {s.engagement && (
        <>
          <h3>Engagement</h3>
          <div className="stats">
            {[['Active today', s.engagement.dau], ['Active this week', s.engagement.wau], ['Learners on 3+ day streak', s.engagement.streaks3], ['Longest live streak', `${s.engagement.bestStreak} 🔥`], ['XP earned this week', s.engagement.xpWeek]].map(([k, v]) => (
              <div key={k} className="card stat"><b>{v}</b><span>{k}</span></div>
            ))}
          </div>
        </>
      )}
      <h3>Recent voice sessions</h3>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>When</th><th>Learner</th><th>Lesson</th><th>Engine</th><th>Length</th><th>Ended</th><th /></tr></thead>
          <tbody>
            {s.recent.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.started_at).toLocaleString()}</td>
                <td>{r.user_name || 'Guest'}</td>
                <td>{r.lesson || 'Free talk'}</td>
                <td>{r.engine}</td>
                <td>{Math.round(r.seconds / 60)} min</td>
                <td className="small muted">{r.end_reason}</td>
                <td><button className="link" onClick={() => view(r.id)}>Transcript</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="card modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="row between"><h3>Session #{open.id}</h3><button className="link" onClick={() => setOpen(null)}>Close</button></div>
            {(open.transcript || []).map((l, i) => <div key={i} className={`msg ${l.role}`}><span className="who">{l.role}</span><p>{l.text}</p></div>)}
            {!open.transcript?.length && <p className="muted">No transcript.</p>}
          </div>
        </div>
      )}
    </>
  );
}
