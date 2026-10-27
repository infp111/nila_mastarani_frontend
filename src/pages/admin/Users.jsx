import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const load = () => api(`/admin/users?q=${encodeURIComponent(q)}`).then((d) => setUsers(d.users));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

  const patch = async (u, body) => {
    try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body }); load(); } catch (e) { alert(e.message); }
  };
  const makeAdmin = (u) => {
    const pw = prompt(`Set an admin password for ${u.email} (min 8 chars):`);
    if (pw) patch(u, { role: 'admin', password: pw });
  };

  return (
    <>
      <div className="row between"><h1>Users</h1><input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Lessons</th><th>Minutes</th><th>Joined</th><th>Last login</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'muted'}>
                <td>{u.name}</td>
                <td>{u.email}{!u.email_verified && <span className="tag">unverified</span>}</td>
                <td>{u.role}</td>
                <td>{u.lessons_done}</td>
                <td>{Math.round(u.seconds / 60)}</td>
                <td className="small">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="small">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                <td className="nowrap">
                  <button className="link" onClick={() => patch(u, { is_active: u.is_active ? 0 : 1 })}>{u.is_active ? 'Disable' : 'Enable'}</button>
                  {' · '}
                  {u.role === 'admin'
                    ? <button className="link" onClick={() => patch(u, { role: 'user' })}>Remove admin</button>
                    : <button className="link" onClick={() => makeAdmin(u)}>Make admin</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
