import { NavLink, Link } from 'react-router-dom';
import { useEngage } from '../engage.jsx';

export function GoalRing({ value, goal, size = 54, stroke = 6, children }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const pct = Math.min(1, goal ? value / goal : 0);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f3ebe2" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={pct >= 1 ? 'var(--ok)' : 'var(--brand)'} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function StatPills({ compact = false }) {
  const { stats } = useEngage() || {};
  if (!stats) return null;
  return (
    <div className={`pills ${compact ? 'compact' : ''}`}>
      <Link to="/me" className={`pill streak ${stats.activeToday ? 'lit' : ''}`} title="Day streak">🔥 {stats.streak}</Link>
      <Link to="/me" className="pill xp" title="Total XP">⚡ {stats.xpTotal}</Link>
      {stats.freezes > 0 && !compact && <span className="pill freeze" title="Streak freezes">🧊 {stats.freezes}</span>}
    </div>
  );
}

export function BottomNav() {
  const { data } = useEngage() || {};
  const due = data?.review?.due || 0;
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end><span>🏠</span>Learn</NavLink>
      <NavLink to="/review"><span>🧠{due > 0 && <i className="dot">{due > 99 ? '99+' : due}</i>}</span>Review</NavLink>
      <NavLink to="/practice"><span>🎙️</span>Talk</NavLink>
      <NavLink to="/leaderboard"><span>🏆</span>League</NavLink>
      <NavLink to="/me"><span>👤</span>Me</NavLink>
    </nav>
  );
}

export function RewardScreen({ reward, accuracy, title = 'Lesson complete!', children }) {
  if (!reward) return null;
  return (
    <div className="reward pop">
      <div className="confetti" aria-hidden>{'🎉✨⭐🎊'.split('').map((e, i) => <span key={i} style={{ '--i': i }}>{e}</span>)}</div>
      <h2>{title}</h2>
      <div className="reward-tiles">
        <div className="tile xp"><small>XP earned</small><b>+{reward.xpEarned}</b></div>
        {accuracy != null && <div className="tile acc"><small>Accuracy</small><b>{accuracy}%</b></div>}
        <div className={`tile st ${reward.streakExtended ? 'grow' : ''}`}><small>Streak</small><b>🔥 {reward.streak}</b></div>
      </div>
      {reward.streakExtended && <p className="ok"><b>Streak extended! ଦିନ ଲଗାତାର ଅଭ୍ୟାସ 🔥</b></p>}
      <div className="goal-line">
        <GoalRing value={reward.todayXp} goal={reward.dailyGoal} size={46} stroke={5}>{reward.goalReached || reward.todayXp >= reward.dailyGoal ? '✓' : ''}</GoalRing>
        <div className="small">{reward.todayXp >= reward.dailyGoal ? <b className="ok">Daily goal reached{reward.goalReached ? ' (+5 bonus XP)' : ''}!</b> : <>Daily goal: <b>{reward.todayXp}/{reward.dailyGoal} XP</b></>}</div>
      </div>
      {reward.achievements?.length > 0 && (
        <div className="new-badges">
          {reward.achievements.map((a) => <div key={a.code} className="badge earned"><span>{a.icon}</span><b>{a.title}</b><small>{a.desc}</small></div>)}
        </div>
      )}
      <div className="row gap center wrap">{children}</div>
    </div>
  );
}
