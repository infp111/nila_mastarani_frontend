// Course as a learning path (Duolingo-style winding path). Each lesson = exercises + AI conversation.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

const OFFSETS = [0, 60, 90, 60, 0, -60, -90, -60];

export default function CoursePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => { api(`/courses/${slug}`).then(setData).catch((e) => setErr(e.message)); }, [slug]);

  if (err) return <main className="container"><div className="alert error">{err}</div></main>;
  if (!data) return <main className="container muted">Loading…</main>;
  const { course, lessons } = data;
  const currentIdx = Math.max(0, lessons.findIndex((l) => l.status !== 'completed'));
  const allDone = lessons.length && lessons.every((l) => l.status === 'completed');
  const done = lessons.filter((l) => l.status === 'completed').length;

  return (
    <main className="container narrow">
      <Link to="/" className="back">← All courses</Link>
      <div className="unit-banner">
        <div className="course-icon big">{course.icon || '📘'}</div>
        <div className="grow">
          <small>{course.level} · {lessons.length} lessons</small>
          <h1>{course.title}</h1>
          {course.title_odia && <p className="odia">{course.title_odia}</p>}
          <div className="progress light"><div style={{ width: `${Math.round((done / Math.max(1, lessons.length)) * 100)}%` }} /></div>
        </div>
      </div>
      <p className="muted">{course.description}</p>

      <div className="path">
        {lessons.map((l, i) => {
          const state = l.status === 'completed' ? 'done' : i === currentIdx && !allDone ? 'current' : i > currentIdx ? 'ahead' : 'started';
          return (
             <div key={l.id} className={`path-step ${open === l.id ? 'open' : ''}`} style={{ '--x': `${OFFSETS[i % OFFSETS.length]}px` }}>
              {state === 'current' && <div className="start-tip">START</div>}
              <button className={`node ${state}`} onClick={() => setOpen(open === l.id ? null : l.id)} aria-label={l.title}>
                {state === 'done' ? '✓' : i + 1}
              </button>
              <div className="node-label">{l.title}</div>
              {open === l.id && (
                <div className="node-pop card pop">
                  <b>{l.title}</b>{l.title_odia && <div className="odia muted small">{l.title_odia}</div>}
                  <p className="small">{l.objective}</p>
                  <div className="row gap wrap">
                    <Link className="btn btn-sm" to={`/lesson/${l.id}`}>{state === 'done' ? '↻ Practise again' : '▶ Start lesson'}</Link>
                    <Link className="btn btn-ghost btn-sm" to={`/learn/${l.id}`}>🎙️ Talk only</Link>
                  </div>
                  <small className="muted">{l.duration_min} min · phrases, exercises, then a role-play with Kathai</small>
                </div>
              )}
            </div>
          );
        })}
        <div className="path-step trophy" style={{ '--x': '0px' }}>
          <div className={`node chest ${allDone ? 'done' : ''}`}>{allDone ? '🏆' : '🎁'}</div>
          <div className="node-label">{allDone ? 'Course complete!' : 'Finish all lessons'}</div>
        </div>
      </div>
    </main>
  );
}
