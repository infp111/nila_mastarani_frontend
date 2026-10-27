import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useEngage } from '../engage.jsx';
import { GoalRing, StatPills } from '../components/Engage.jsx';

const CAT_LABEL = { etiquette: 'Etiquette', pronunciation: 'Pronunciation', grammar: 'Grammar', daily: 'Day-to-day', formal: 'Formal', career: 'Career', interview: 'Interview', fluency: 'Fluency', general: 'General' };
const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Home() {
  const { user } = useAuth();
  const { data } = useEngage();
  const [courses, setCourses] = useState(null);
  const [cat, setCat] = useState('all');
  const [err, setErr] = useState('');

  useEffect(() => { api('/courses').then((d) => setCourses(d.courses)).catch((e) => setErr(e.message)); }, []);
  const cats = useMemo(() => ['all', ...new Set((courses || []).map((c) => c.category))], [courses]);
  const shown = (courses || []).filter((c) => cat === 'all' || c.category === cat);

  const s = data?.stats;
  if (s && !s.onboarded && !localStorage.getItem('kathai_onboarded')) return <Navigate to="/welcome" replace />;
  const fresh = !s || s.xpTotal === 0;
  const first = user ? user.name.split(' ')[0] : null;

  return (
    <main className="container">
      {fresh ? (
        <section className="hero">
          <div>
            <p className="eyebrow">{first ? `Namaskar, ${first} 🙏` : 'Your personal English tutor'}</p>
            <h1>Speak English with confidence.<br /><span className="odia accent">ଓଡ଼ିଆରେ ଶିଖନ୍ତୁ, ଇଂରାଜୀରେ କୁହନ୍ତୁ।</span></h1>
            <p className="muted">Short lessons, fun exercises and real conversations with Kathai, an AI tutor that explains in Odia and corrects you gently. No login needed.</p>
            <div className="row gap wrap">
              {data?.next ? <Link to={`/lesson/${data.next.id}`} className="btn btn-lg">▶ Start your first lesson</Link> : <Link to="/practice" className="btn btn-lg">🎙️ Start talking now</Link>}
              {!user && <Link to="/signin" className="btn btn-ghost btn-lg">I have an account</Link>}
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <div className="bubble b1">Good morning! How are you?</div>
            <div className="bubble b2 odia">ସୁପ୍ରଭାତ! ଆପଣ କେମିତି ଅଛନ୍ତି?</div>
            <div className="bubble b3">I'm fine, thank you 😊</div>
          </div>
        </section>
      ) : (
        <section className="dash">
          <div className="dash-head">
            <div>
              <p className="eyebrow">{first ? `Namaskar, ${first} 🙏` : 'Namaskar 🙏'}</p>
              <h2 className="tight">{s.activeToday ? (s.todayXp >= s.dailyGoal ? 'Daily goal done. Brilliant! 🎉' : 'Nice! Keep going today.') : s.streak ? `Practise today to keep your ${s.streak}-day streak 🔥` : 'Ready for today\'s practice?'}</h2>
            </div>
            <StatPills />
          </div>
          {s.streakLost > 0 && <div className="alert info">Your {s.streakLost}-day streak ended. Start a new one today, you've got this! 💪</div>}
          {s.freezeUsed > 0 && <div className="alert info">🧊 A streak freeze saved your streak while you were away.</div>}

          <div className="dash-grid">
            {data.next && (
              <Link to={`/lesson/${data.next.id}`} className="card continue">
                <div className="course-icon">{data.next.icon || '📘'}</div>
                <div className="grow">
                  <small className="muted">Continue · {data.next.course_title}</small>
                  <h3>{data.next.title}</h3>
                  {data.next.title_odia && <p className="odia muted small">{data.next.title_odia}</p>}
                </div>
                <span className="btn">Start</span>
              </Link>
            )}
            <div className="card goal-card">
              <GoalRing value={s.todayXp} goal={s.dailyGoal} size={72} stroke={8}><b>{s.todayXp}</b></GoalRing>
              <div>
                <small className="muted">Daily goal</small>
                <div><b>{s.todayXp} / {s.dailyGoal} XP</b></div>
                <div className="week">{data.week.map((w) => <span key={w.day} className={w.xp ? (w.xp >= s.dailyGoal ? 'hit' : 'some') : ''} title={`${w.day}: ${w.xp} XP`}>{DAY[new Date(`${w.day}T12:00:00`).getDay()]}</span>)}</div>
              </div>
            </div>
            <Link to="/review" className="card quick">
              <span className="q-icon">🧠</span>
              <div><b>Review</b><small className="muted">{data.review.due ? `${data.review.due} ready to review` : 'All caught up'}</small></div>
            </Link>
            <Link to="/practice" className="card quick">
              <span className="q-icon">🎙️</span>
              <div><b>Free talk</b><small className="muted">Chat about anything</small></div>
            </Link>
          </div>
        </section>
      )}

      <h2 className="section-title">Courses</h2>
      <div className="chips">
        {cats.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c === 'all' ? 'All courses' : CAT_LABEL[c] || c}
          </button>
        ))}
      </div>

      {err && <div className="alert error">{err}</div>}
      {!courses && !err && <div className="muted">Loading courses…</div>}
      <div className="grid">
        {shown.map((c) => (
          <Link key={c.id} to={`/course/${c.slug}`} className="card course-card">
            <div className="course-icon">{c.icon || '📘'}</div>
            <div className="grow">
              <h3>{c.title}</h3>
              {c.title_odia && <p className="odia muted">{c.title_odia}</p>}
              <p className="small">{c.description}</p>
              <div className="meta">
                <span className={`tag lvl-${c.level}`}>{c.level}</span>
                <span>{c.lesson_count} lessons</span>
                {c.completed > 0 && <span className="ok">✓ {c.completed} done</span>}
              </div>
              {c.lesson_count > 0 && <div className="progress"><div style={{ width: `${Math.round(((c.completed || 0) / c.lesson_count) * 100)}%` }} /></div>}
            </div>
          </Link>
        ))}
      </div>
      {courses && !shown.length && <p className="muted">No courses yet. The admin can add them from the admin panel.</p>}
    </main>
  );
}
