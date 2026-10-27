// Weekly league (Duolingo-style): XP earned Monday to Sunday, resets every week.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);

export default function Leaderboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/leaderboard').then(setD).catch(() => setD({ board: [] })); }, []);
  if (!d) return <main className="container narrow muted">Loading…</main>;
  const daysLeft = d.weekEnd ? Math.max(0, Math.ceil((Date.parse(`${d.weekEnd}T00:00:00+05:30`) - Date.now()) / 86400000)) : null;
  return (
    <main className="container narrow">
      <h1>🏆 Weekly league</h1>
      <p className="muted">Earn XP from lessons, conversations and reviews to climb. {daysLeft != null && <>Resets in <b>{daysLeft} day{daysLeft === 1 ? '' : 's'}</b>.</>}</p>
      {!d.signedIn && <div className="alert info">You're a guest, so you're not on the board yet. <Link to="/signin">Sign up free</Link> to compete{d.me?.xp ? ` with your ${d.me.xp} XP this week` : ''}.</div>}
      <div className="card board">
        {d.board.length ? d.board.map((b) => (
          <div key={b.rank} className={`board-row ${b.me ? 'me' : ''} ${b.rank <= 3 ? 'top' : ''}`}>
            <span className="rank">{medal(b.rank)}</span>
            <span className="avatar">{b.name[0]?.toUpperCase()}</span>
            <span className="grow">{b.name}{b.me && ' (you)'}{b.streak > 0 && <small className="muted"> · 🔥 {b.streak}</small>}</span>
            <b>{b.xp} XP</b>
          </div>
        )) : <p className="muted">No one has earned XP this week yet. Be the first!</p>}
      </div>
      {d.signedIn && d.me && !d.me.rank && <p className="muted small">You have {d.me.xp} XP this week. Finish a lesson to join the board.</p>}
    </main>
  );
}
