import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';

export default function Courses() {
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/admin/courses').then((d) => setList(d.courses)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function create() {
    const title = prompt('Course title (e.g. "Telephone English")');
    if (!title) return;
    const d = await api('/admin/courses', { method: 'POST', body: { title, category: 'general', is_published: 0 } });
    nav(`/admin/courses/${d.course.id}`);
  }
  async function move(i, dir) {
    const arr = [...list];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setList(arr);
    await api('/admin/courses/reorder', { method: 'POST', body: { ids: arr.map((c) => c.id) } });
  }
  async function togglePublish(c) {
    await api(`/admin/courses/${c.id}`, { method: 'PUT', body: { ...c, is_published: c.is_published ? 0 : 1 } });
    load();
  }

  return (
    <>
      <div className="row between"><h1>Courses</h1><button className="btn" onClick={create}>+ New course</button></div>
      <p className="muted small">Design structured courses (Etiquette, Day-to-day, Formal, Interview…). Each course has lessons with key phrases, vocabulary and a role-play that the AI tutor follows.</p>
      {err && <div className="alert error">{err}</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Course</th><th>Category</th><th>Level</th><th>Lessons</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(list || []).map((c, i) => (
              <tr key={c.id}>
                <td className="nowrap"><button className="link" onClick={() => move(i, -1)}>▲</button> <button className="link" onClick={() => move(i, 1)}>▼</button></td>
                <td><Link to={`/admin/courses/${c.id}`}><b>{c.icon} {c.title}</b></Link><div className="odia small muted">{c.title_odia}</div></td>
                <td><span className="tag">{c.category}</span></td>
                <td>{c.level}</td>
                <td>{c.lesson_count}</td>
                <td><button className={`tag ${c.is_published ? 'ok-bg' : ''}`} onClick={() => togglePublish(c)}>{c.is_published ? 'Published' : 'Draft'}</button></td>
                <td><Link to={`/admin/courses/${c.id}`} className="btn btn-sm btn-ghost">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
