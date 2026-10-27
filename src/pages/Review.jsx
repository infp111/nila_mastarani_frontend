// Spaced-repetition review (Babbel Review Manager style): phrases and words come back right before you'd forget them.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useEngage } from '../engage.jsx';
import { RewardScreen } from '../components/Engage.jsx';
import { Exercise } from './Lesson.jsx';

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

function toExercise(it, pool, i) {
  const others = (key) => shuffle(pool.filter((p) => p[key] && p.en !== it.en && p.kind === it.kind)).slice(0, 3).map((p) => p[key]);
  const mode = it.odia ? i % 3 : 2;
  if (mode === 0 && others('en').length >= 1) return { type: 'choose', prompt: it.odia, promptOdia: true, answer: it.en, options: shuffle([it.en, ...others('en')]), speakAnswer: true };
  if (mode === 1 && others('odia').length >= 1) return { type: 'choose', prompt: it.en, answer: it.odia, answerOdia: true, options: shuffle([it.odia, ...others('odia')]), speakPrompt: true };
  return { type: 'speak', answer: it.en, hint: it.odia };
}

export default function Review() {
  const { data, refresh } = useEngage();
  const [items, setItems] = useState(null);
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [reward, setReward] = useState(null);
  const [started, setStarted] = useState(false);

  const load = async (any = false) => {
    const d = await api(`/review${any ? '?any=1' : ''}`);
    setItems(d.items); setQueue(d.items.map((it, i) => ({ ...toExercise(it, d.pool, i), key: it.id, id: it.id })));
    setPos(0); setCorrect(0); setReward(null);
    return d.items.length;
  };
  useEffect(() => { load(); }, []);

  async function onAnswer(ok) {
    const cur = queue[pos];
    if (ok) setCorrect((c) => c + 1);
    api(`/review/${cur.id}/answer`, { method: 'POST', body: { correct: ok } }).catch(() => {});
  }
  async function next() {
    if (pos + 1 < queue.length) return setPos(pos + 1);
    const d = await api('/review/finish', { method: 'POST', body: { correct: Math.min(20, correct) } });
    setReward(d.reward); refresh();
  }

  if (!items) return <main className="container narrow muted">Loading…</main>;

  if (!started || reward) {
    return (
      <main className="container narrow">
        <h1>🧠 Review</h1>
        {reward ? (
          <RewardScreen reward={reward} accuracy={Math.round((correct / Math.max(1, queue.length)) * 100)} title="Review done! 🧠">
            <Link className="btn" to="/">Back to learning</Link>
          </RewardScreen>
        ) : items.length ? (
          <div className="card hero-card">
            <p className="big"><b>{items.length}</b> phrases and words are ready to review</p>
            <p className="muted">Kathai brings back what you learned right before you'd forget it. Correct answers come back later; mistakes come back sooner.</p>
            <button className="btn btn-lg" onClick={() => setStarted(true)}>Start review</button>
          </div>
        ) : (
          <div className="card hero-card">
            <p className="big">All caught up! ✅</p>
            <p className="muted">{data?.review?.total ? `You have ${data.review.total} items in your memory bank. Nothing is due right now.` : 'Finish a lesson and its phrases will appear here for review.'}</p>
            <div className="row gap wrap">
              {data?.review?.total > 0 && <button className="btn btn-ghost" onClick={async () => { if (await load(true)) setStarted(true); }}>Practise weakest anyway</button>}
              <Link className="btn" to="/">Learn something new</Link>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="lesson">
      <header className="lesson-top">
        <Link to="/" className="x">✕</Link>
        <div className="bar"><div style={{ width: `${Math.round((pos / queue.length) * 100)}%` }} /></div>
      </header>
      <main className="lesson-main">{queue[pos] && <Exercise key={queue[pos].key} ex={queue[pos]} onAnswer={onAnswer} onNext={next} />}</main>
    </div>
  );
}
