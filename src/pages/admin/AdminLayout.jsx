import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="admin">
      <aside className="admin-nav">
        <Link to="/admin" className="brand"><img src="/icon.svg" alt="" /> Kathai Admin</Link>
        <NavLink to="/admin" end>📊 Dashboard</NavLink>
        <NavLink to="/admin/courses">📚 Courses</NavLink>
        <NavLink to="/admin/engines">🤖 AI Engines & Voice</NavLink>
        <NavLink to="/admin/tutor">🧑‍🏫 Tutor & Limits</NavLink>
        <NavLink to="/admin/mail">✉️ Mail settings</NavLink>
        <NavLink to="/admin/users">👥 Users</NavLink>
        <div className="grow" />
        <Link to="/" className="small">↗ Open app</Link>
        <div className="small muted">{user?.email}</div>
        <button className="link small" onClick={() => { logout(); nav('/admin/login'); }}>Sign out</button>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}
