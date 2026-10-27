import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';

const CATEGORIES = ['etiquette', 'pronunciation', 'grammar', 'daily', 'formal', 'career', 'fluency', 'interview', 'general'];
const EMPTY_LESSON = { title: '', title_odia: '', objective: '', key_phrases: [{ en: '', or: '' }], vocabulary: [], roleplay_scenario: '', tutor_instructions: '', duration_min: 10, is_published: 1 };

function PairEditor({ label, items, onChange, enPh, orPh }) {
  const set = (i, k, v) => onChange(items.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <div className="pairs">
      <div className="row between"><span className="label">{label}</span><button type="button" className="link" onClick={() => onChange([...items, { en: '', or: '' }])}>+ Add</button></div>
      {items.map((p, i) => (
        <div key={i} className="pair">
          <input value={p.en} onChange={(e) => set(i, 'en', e.target.value)} placeholder={enPh} />
          <input className="odia" value={p.or} onChange={(e) => set(i, 'or', e.target.value)} placeholder={orPh} />
          <button type="button" className="link danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
    </div>
  );
}

function LessonEditor({ courseId, lesson, onSaved, onCancel }) {
  const [l, setL] = useState(lesson);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const f = (k) => (e) => setL({ ...l, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (l.id) await api(`/admin/lessons/${l.id}`, { method: 'PUT', body: l });
      else await api(`/admin/courses/${courseId}/lessons`, { method: 'POST', body: l });
      onSaved();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <form className="card form lesson-editor" onSubmit={save}>
      <div className="grid2">
        <label>Lesson title (English)<input required value={l.title} onChange={f('title')} placeholder="At the Railway Station" /></label>
        <label>Title in Odia<input className="odia" value={l.title_odia || ''} onChange={f('title_odia')} placeholder="ରେଳ ଷ୍ଟେସନରେ" /></label>
      </div>
      <label>Learning objective<textarea rows={2} value={l.objective || ''} onChange={f('objective')} placeholder="Learner can buy a ticket and ask about train timings." /></label>
      <PairEditor label="Key phrases (the tutor teaches these one by one)" items={l.key_phrases || []} onChange={(v) => setL({ ...l, key_phrases: v })} enPh="English phrase" orPh="ଓଡ଼ିଆ ଅର୍ଥ" />
      <PairEditor label="Vocabulary" items={l.vocabulary || []} onChange={(v) => setL({ ...l, vocabulary: v })} enPh="word" orPh="ଶବ୍ଦ" />
      <label>Role-play scenario<textarea rows={2} value={l.roleplay_scenario || ''} onChange={f('roleplay_scenario')} placeholder="You are the ticket clerk. The learner wants a ticket to Cuttack." /></label>
      <label>Extra instructions for the AI tutor<textarea rows={2} value={l.tutor_instructions || ''} onChange={f('tutor_instructions')} placeholder="Focus on the 'th' sound. Keep it very simple." /></label>
      <div className="row gap wrap">
        <label className="inline">Duration (min)<input type="number" min={1} max={120} value={l.duration_min} onChange={f('duration_min')} style={{ width: 80 }} /></label>
        <label className="inline check"><input type="checkbox" checked={Boolean(l.is_published)} onChange={f('is_published')} /> Published</label>
      </div>
      {err && <div className="alert error">{err}</div>}
      <div className="row gap"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save lesson'}</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export default function CourseEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [engines, setEngines] = useState([]);
  const [editing, setEditing] = useState(null); // lesson id | 'new'
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => api(`/admin/courses/${id}`).then((d) => { setC(d.course); setLessons(d.lessons); });
  useEffect(() => { load(); api('/admin/engines').then((d) => setEngines(d.engines)); }, [id]);
  if (!c) return <p className="muted">Loading…</p>;

  const f = (k) => (e) => setC({ ...c, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value });

  async function saveCourse(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { const d = await api(`/admin/courses/${id}`, { method: 'PUT', body: c }); setC(d.course); setMsg('Saved ✓'); } catch (ex) { setErr(ex.message); }
  }
  async function del() {
    if (!confirm(`Delete "${c.title}" and all its lessons?`)) return;
    await api(`/admin/courses/${id}`, { method: 'DELETE' });
    nav('/admin/courses');
  }
  async function delLesson(l) {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    await api(`/admin/lessons/${l.id}`, { method: 'DELETE' }); load();
  }
  async function move(i, dir) {
    const arr = [...lessons]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; setLessons(arr);
    await api(`/admin/courses/${id}/lessons/reorder`, { method: 'POST', body: { ids: arr.map((x) => x.id) } });
  }

  return (
    <>
      <Link to="/admin/courses" className="back">← Courses</Link>
      <div className="row between"><h1>{c.icon} {c.title}</h1>{c.is_published ? <Link className="small" to={`/course/${c.slug}`} target="_blank">View in app ↗</Link> : null}</div>

      <form className="card form" onSubmit={saveCourse}>
        <div className="grid2">
          <label>Title<input required value={c.title} onChange={f('title')} /></label>
          <label>Title in Odia<input className="odia" value={c.title_odia || ''} onChange={f('title_odia')} /></label>
        </div>
        <label>Description<textarea rows={2} value={c.description || ''} onChange={f('description')} /></label>
        <div className="grid4">
          <label>Category
            <input list="cats" value={c.category} onChange={f('category')} />
            <datalist id="cats">{CATEGORIES.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
          <label>Level
            <select value={c.level} onChange={f('level')}><option>beginner</option><option>intermediate</option><option>advanced</option></select>
          </label>
          <label>Icon (emoji)<input value={c.icon || ''} onChange={f('icon')} maxLength={8} /></label>
          <label>URL slug<input value={c.slug} onChange={f('slug')} /></label>
        </div>
        <label>AI engine for this course
          <select value={c.engine_id || ''} onChange={f('engine_id')}>
            <option value="">Use default engine</option>
            {engines.map((e) => <option key={e.id} value={e.id}>{e.name}{e.is_active ? '' : ' (inactive)'}</option>)}
          </select>
        </label>
        <label>Course-wide tutor guidance<textarea rows={2} value={c.course_instructions || ''} onChange={f('course_instructions')} placeholder="e.g. Use a professional tone; contrast casual vs formal sentences." /></label>
        <label className="inline check"><input type="checkbox" checked={Boolean(c.is_published)} onChange={f('is_published')} /> Published (visible to learners)</label>
        {err && <div className="alert error">{err}</div>}
        <div className="row gap"><button className="btn">Save course</button>{msg && <span className="ok">{msg}</span>}<div className="grow" /><button type="button" className="btn btn-ghost danger" onClick={del}>Delete course</button></div>
      </form>

      <div className="row between"><h2>Lessons</h2><button className="btn" onClick={() => setEditing('new')}>+ Add lesson</button></div>
      {editing === 'new' && <LessonEditor courseId={id} lesson={EMPTY_LESSON} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
      {lessons.map((l, i) => (
        editing === l.id ? (
          <LessonEditor key={l.id} courseId={id} lesson={l} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        ) : (
          <div key={l.id} className="card lesson-row admin-lesson">
            <span className="nowrap"><button className="link" onClick={() => move(i, -1)}>▲</button><button className="link" onClick={() => move(i, 1)}>▼</button></span>
            <span className="num">{i + 1}</span>
            <div className="grow">
              <strong>{l.title}</strong> <span className="odia muted">{l.title_odia}</span>
              <div className="small muted">{l.key_phrases.length} phrases · {l.vocabulary.length} words · {l.duration_min} min {l.is_published ? '' : '· Draft'}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(l.id)}>Edit</button>
            <button className="link danger" onClick={() => delLesson(l)}>Delete</button>
          </div>
        )
      ))}
      {!lessons.length && editing !== 'new' && <p className="muted">No lessons yet.</p>}
    </>
  );
}
