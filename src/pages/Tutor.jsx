import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { TutorSession } from '../audio/tutorSession.js';
import { useEngage } from '../engage.jsx';
import { RewardScreen } from '../components/Engage.jsx';

const STATUS_TEXT = {
  idle: 'Tap the mic to start',
  connecting: 'Connecting to your tutor…',
  listening: 'Listening… speak now',
  'tutor-speaking': 'Kathai is speaking',
  ended: 'Session ended',
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Tutor() {
  const { lessonId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [status, setStatus] = useState('idle');
  const [lines, setLines] = useState([]);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [maxSec, setMaxSec] = useState(0);
  const [summary, setSummary] = useState(null);
  const [text, setText] = useState('');
  const [showPhrases, setShowPhrases] = useState(true);
  const [reward, setReward] = useState(null);
  const { refresh } = useEngage();
  const sess = useRef(null);
  const scroller = useRef(null);

  useEffect(() => {
    setLesson(null); setLines([]); setSummary(null); setStatus('idle'); setError('');
    if (lessonId) api(`/lessons/${lessonId}`).then((d) => setLesson(d.lesson)).catch((e) => setError(e.message));
    return () => sess.current?.stop();
  }, [lessonId]);

  useEffect(() => {
    if (status === 'idle' || status === 'ended' || status === 'connecting') return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status === 'idle' || status === 'ended' || status === 'connecting']);

  useEffect(() => { scroller.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [lines]);

  const addLine = ({ role, text: t }) => setLines((prev) => {
    const last = prev[prev.length - 1];
    if (last && last.role === role && !last.closed) return [...prev.slice(0, -1), { ...last, text: last.text + t }];
    return [...prev.map((p) => ({ ...p, closed: true })), { role, text: t }];
  });

  async function start() {
    setError(''); setInfo(''); setSummary(null); setLines([]); setElapsed(0);
    const s = new TutorSession({
      lessonId,
      onStatus: setStatus,
      onTranscript: addLine,
      onLevel: (l) => setLevel(l.mic ?? l.tutor ?? 0),
      onInfo: setInfo,
      onError: (m) => setError(m),
      onReady: (m) => setMaxSec(m.maxSeconds),
      onEnded: (m) => { setSummary(m); setTimeout(refresh, 1500); },
    });
    sess.current = s;
    try { await s.start(); } catch (e) {
      setStatus('idle');
      setError(e.name === 'NotAllowedError' ? 'Microphone permission is needed. Please allow mic access and try again.' : e.message);
    }
  }

  function stop() { sess.current?.stop(); }
  function toggleMute() { const m = !muted; setMuted(m); sess.current?.setMuted(m); }
  function sendText(e) {
    e.preventDefault();
    if (!text.trim()) return;
    addLine({ role: 'user', text: text.trim() });
    setLines((p) => p.map((x) => ({ ...x, closed: true })));
    sess.current?.sendText(text.trim());
    setText('');
  }
  async function complete() {
    const d = await api(`/lessons/${lessonId}/complete`, { method: 'POST' }).catch(() => null);
    refresh();
    if (d?.reward) { setSummary(null); setReward(d.reward); return; }
    goNext();
  }
  function goNext() {
    if (lesson?.next_lesson_id) nav(`/lesson/${lesson.next_lesson_id}`);
    else nav(`/course/${lesson.course_slug}`);
  }

  const live = ['listening', 'tutor-speaking'].includes(status);
  const scale = 1 + Math.min(level * 2.5, 0.6);

  return (
    <div className="tutor">
      <header className="tutor-top">
        <Link to={lesson ? `/course/${lesson.course_slug}` : '/'} className="back">←</Link>
        <div className="grow">
          <div className="small muted">{lesson ? lesson.course_title : 'Free conversation'}</div>
          <strong>{lesson ? lesson.title : 'Talk about anything'}</strong>
          {lesson?.title_odia && <span className="odia muted"> · {lesson.title_odia}</span>}
        </div>
        {live && <span className="timer">{fmt(elapsed)}{maxSec ? ` / ${fmt(maxSec)}` : ''}</span>}
      </header>

      <div className="tutor-body">
        {lesson && (lesson.key_phrases?.length > 0) && (
          <aside className={`phrases ${showPhrases ? '' : 'collapsed'}`}>
            <button className="link" onClick={() => setShowPhrases(!showPhrases)}>{showPhrases ? 'Hide' : 'Show'} key phrases</button>
            {showPhrases && (
              <>
                {lesson.objective && <p className="small muted">🎯 {lesson.objective}</p>}
                <ul>
                  {lesson.key_phrases.map((p, i) => (
                    <li key={i}><div>{p.en}</div><div className="odia muted small">{p.or}</div></li>
                  ))}
                </ul>
                {lesson.vocabulary?.length > 0 && (
                  <>
                    <h4>Words</h4>
                    <div className="vocab">{lesson.vocabulary.map((v, i) => <span key={i} className="tag">{v.en} · <span className="odia">{v.or}</span></span>)}</div>
                  </>
                )}
              </>
            )}
          </aside>
        )}

        <section className="conversation">
          <div className="transcript" ref={scroller}>
            {!lines.length && status === 'idle' && !reward && (
              <div className="empty">
                <p className="odia big">ନମସ୍କାର! 🙏</p>
                <p className="muted">Tap the microphone and Kathai will greet you in Odia and start the lesson. Use headphones for the best experience.</p>
                {!user && <p className="small muted">You're learning as a guest. <Link to="/signin">Sign up free</Link> to save progress and get longer sessions.</p>}
              </div>
            )}
            {lines.map((l, i) => (
              <div key={i} className={`msg ${l.role}`}>
                <span className="who">{l.role === 'tutor' ? 'Kathai' : 'You'}</span>
                <p>{l.text}</p>
              </div>
            ))}
          </div>

          {error && <div className="alert error">{error}{/sign up/i.test(error) && <> <Link to="/signin">Sign up</Link></>}</div>}
          {info && <div className="alert info">{info}</div>}

          {reward && (
            <RewardScreen reward={reward} title="Lesson complete! 🏅">
              <button className="btn btn-lg" onClick={goNext}>{lesson?.next_lesson_id ? 'Next lesson →' : 'Back to course'}</button>
              <button className="btn btn-ghost" onClick={() => { setReward(null); start(); }}>Talk again</button>
            </RewardScreen>
          )}
          {summary && (
            <div className="card summary">
              <strong>Great practice! 🎉</strong> You spoke for {fmt(summary.seconds || elapsed)}.
              <div className="row gap">
                {lesson && <button className="btn" onClick={complete}>✓ Mark complete {lesson.next_lesson_id ? '& next lesson' : ''}</button>}
                <button className="btn btn-ghost" onClick={start}>Practise again</button>
              </div>
            </div>
          )}

          <div className="controls">
            <div className={`status s-${status}`}>{STATUS_TEXT[status]}</div>
            <div className="row center gap">
              {live && <button className={`round ${muted ? 'danger' : ''}`} onClick={toggleMute} title="Mute">{muted ? '🔇' : '🎤'}</button>}
              <button
                className={`orb ${live ? 'live' : ''} ${status === 'tutor-speaking' ? 'speaking' : ''}`}
                style={{ transform: live ? `scale(${scale})` : undefined }}
                onClick={live || status === 'connecting' ? stop : start}
                disabled={status === 'connecting'}
                aria-label={live ? 'End session' : 'Start session'}
              >
                {status === 'connecting' ? '…' : live ? '■' : '🎙️'}
              </button>
              {live && <button className="round" onClick={stop} title="End">✕</button>}
            </div>
            {live && (
              <form className="type-box" onSubmit={sendText}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type in English / ଓଡ଼ିଆ…" />
                <button className="btn btn-sm">Send</button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
