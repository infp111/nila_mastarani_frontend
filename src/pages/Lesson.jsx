// Structured lesson flow (Babbel/Busuu-style): Learn phrases -> bite-size exercises (Duolingo-style) -> reward -> AI role-play.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useEngage, speak, canListen, listenOnce, similarity, sameAnswer, ding } from '../engage.jsx';
import { RewardScreen } from '../components/Engage.jsx';

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const words = (s) => s.split(/\s+/).filter(Boolean);
const EXTRA = ['is', 'the', 'very', 'do', 'my', 'was', 'not', 'please', 'it', 'you', 'have', 'go'];

function buildExercises(lesson) {
  const P = (lesson.key_phrases || []).filter((p) => p.en);
  const V = (lesson.vocabulary || []).filter((v) => v.en);
  const ex = [];
  const others = (list, item, n = 3) => shuffle(list.filter((x) => x.en !== item.en)).slice(0, n);
  P.forEach((p, i) => {
    if (p.or && P.length >= 2) ex.push({ type: 'choose', prompt: p.or, promptOdia: true, answer: p.en, options: shuffle([p, ...others(P, p)]).map((x) => x.en), speakAnswer: true });
    const w = words(p.en);
    if (w.length >= 3 && w.length <= 10) {
      const extra = shuffle(EXTRA.filter((x) => !w.map((y) => y.toLowerCase()).includes(x))).slice(0, 3);
      ex.push({ type: 'build', prompt: p.or || p.en, promptOdia: Boolean(p.or), answer: p.en, tiles: shuffle([...w, ...extra]) });
    }
    if (i % 2 === 0 && P.length >= 2) ex.push({ type: 'listen', answer: p.en, options: shuffle([p, ...others(P, p, 2)]).map((x) => x.en) });
    ex.push({ type: 'speak', answer: p.en, hint: p.or });
  });
  if (V.length >= 2) ex.push({ type: 'match', pairs: shuffle(V).slice(0, 5) });
  V.slice(0, 3).forEach((v) => { if (v.or && V.length >= 2) ex.push({ type: 'choose', prompt: v.en, answer: v.or, answerOdia: true, options: shuffle([v, ...others(V, v)]).map((x) => x.or), speakPrompt: true }); });
  // Interleave types and cap at ~12 so a lesson stays 5-7 minutes
  const byType = {}; ex.forEach((e) => { (byType[e.type] = byType[e.type] || []).push(e); });
  const out = []; let added = true;
  while (added && out.length < 12) { added = false; for (const t of ['choose', 'build', 'listen', 'match', 'speak']) { const e = byType[t]?.shift(); if (e && out.length < 12) { out.push(e); added = true; } } }
  return out;
}

export default function Lesson() {
  const { lessonId } = useParams();
  const nav = useNavigate();
  const { refresh } = useEngage();
  const [lesson, setLesson] = useState(null);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('learn'); // learn | practice | done
  const [card, setCard] = useState(0);
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(0);
  const [firstTry, setFirstTry] = useState({ correct: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    setStage('learn'); setCard(0); setPos(0); setResult(null);
    api(`/lessons/${lessonId}`).then((d) => { setLesson(d.lesson); }).catch((e) => setErr(e.message));
  }, [lessonId]);

  const exercises = useMemo(() => (lesson ? buildExercises(lesson) : []), [lesson]);
  useEffect(() => { setQueue(exercises.map((e, i) => ({ ...e, key: i, retry: false }))); setFirstTry({ correct: 0, total: exercises.length }); }, [exercises]);

  if (err) return <main className="container narrow"><div className="alert error">{err}</div></main>;
  if (!lesson) return <main className="container narrow muted">Loading…</main>;
  const phrases = lesson.key_phrases || [];
  const totalSteps = phrases.length + queue.length;
  const doneSteps = stage === 'learn' ? card : stage === 'practice' ? phrases.length + pos : totalSteps;

  async function finishPractice() {
    setStage('done');
    try {
      const d = await api(`/lessons/${lessonId}/practice`, { method: 'POST', body: { correct: firstTry.correct, total: Math.max(1, firstTry.total) } });
      setResult(d); refresh();
    } catch (e) { setResult({ error: e.message }); }
  }

  function onAnswer(ok) {
    const cur = queue[pos];
    if (!cur.retry && ok) setFirstTry((f) => ({ ...f, correct: f.correct + 1 }));
    // Mistakes come back at the end (Duolingo-style), so every lesson ends on a correct answer.
    if (!ok && !cur.retry) setQueue((q) => [...q, { ...cur, key: `${cur.key}r`, retry: true }]);
  }
  function next() {
    if (pos + 1 >= queue.length) finishPractice();
    else setPos(pos + 1);
  }

  return (
    <div className="lesson">
      <header className="lesson-top">
        <Link to={`/course/${lesson.course_slug}`} className="x" aria-label="Close">✕</Link>
        <div className="bar"><div style={{ width: `${Math.round((doneSteps / Math.max(1, totalSteps)) * 100)}%` }} /></div>
      </header>

      <main className="lesson-main">
        {stage === 'learn' && phrases.length > 0 && (
          <LearnCard key={card} lesson={lesson} p={phrases[card]} index={card} count={phrases.length}
            onNext={() => (card + 1 < phrases.length ? setCard(card + 1) : setStage(queue.length ? 'practice' : 'done'))} />
        )}
        {stage === 'learn' && phrases.length === 0 && (
          <div className="center"><p>This lesson has no phrases yet.</p><Link className="btn" to={`/learn/${lesson.id}`}>Talk with Kathai</Link></div>
        )}
        {stage === 'practice' && queue[pos] && <Exercise key={queue[pos].key} ex={queue[pos]} onAnswer={onAnswer} onNext={next} />}
        {stage === 'done' && (
          result?.reward ? (
            <RewardScreen reward={result.reward} accuracy={result.accuracy} title="Practice complete! 🎉">
              <button className="btn btn-lg" onClick={() => nav(`/learn/${lesson.id}`)}>🎙️ Now speak with Kathai</button>
              <Link className="btn btn-ghost" to={`/course/${lesson.course_slug}`}>Later</Link>
              <p className="small muted full">Final step: a real role-play conversation with your AI tutor to use these phrases out loud.</p>
            </RewardScreen>
          ) : result?.error ? <div className="alert error">{result.error}</div> : <div className="center muted">Saving…</div>
        )}
      </main>
    </div>
  );
}

function LearnCard({ lesson, p, index, count, onNext }) {
  const [heard, setHeard] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { speak(p.en); }, [p.en]);
  async function tryIt() {
    setBusy(true); setHeard(null);
    try { const alts = await listenOnce(); const best = Math.max(0, ...[].concat(alts || []).map((a) => similarity(a, p.en))); setHeard({ text: [].concat(alts)[0] || '', score: alts ? best : 0 }); }
    catch (e) { setHeard({ text: '', score: 0, err: e.message }); }
    setBusy(false);
  }
  return (
    <div className="learn-card pop">
      {index === 0 && lesson.objective && <p className="objective">🎯 {lesson.objective}</p>}
      <p className="eyebrow">New phrase {index + 1} of {count}</p>
      <div className="phrase-big">
        <button className="speaker" onClick={() => speak(p.en)} aria-label="Listen">🔊</button>
        <div>
          <h2>{p.en}</h2>
          {p.or && <p className="odia accent">{p.or}</p>}
          <button className="link small" onClick={() => speak(p.en, { rate: 0.6 })}>🐢 Slow</button>
        </div>
      </div>
      {canListen() && (
        <div className="try">
          <button className="btn btn-ghost" onClick={tryIt} disabled={busy}>{busy ? '🎙️ Listening…' : '🎙️ Say it'}</button>
          {heard && <Score heard={heard} />}
        </div>
      )}
      <div className="lesson-foot"><button className="btn btn-lg btn-block" onClick={onNext}>Continue</button></div>
    </div>
  );
}

function Score({ heard }) {
  if (heard.err) return <p className="small muted">Mic not available ({heard.err}). You can continue.</p>;
  if (!heard.text) return <p className="small muted">I didn't hear anything. Try again closer to the mic.</p>;
  const cls = heard.score >= 80 ? 'ok' : heard.score >= 50 ? 'accent' : 'danger';
  return <p className="small">You said: “{heard.text}” · <b className={cls}>{heard.score >= 80 ? 'Excellent!' : heard.score >= 50 ? 'Almost there' : 'Try again'} ({heard.score}%)</b></p>;
}

export function Exercise({ ex, onAnswer, onNext }) {
  const [pick, setPick] = useState(null);
  const [built, setBuilt] = useState([]);
  const [checked, setChecked] = useState(null); // {ok}
  const [heard, setHeard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [matchSel, setMatchSel] = useState(null);
  const [matched, setMatched] = useState([]);
  const [wrongPair, setWrongPair] = useState(null);
  const [mistake, setMistake] = useState(false);
  const right = useMemo(() => (ex.type === 'match' ? shuffle(ex.pairs.map((p) => p.or)) : []), [ex]);

  useEffect(() => { if (ex.type === 'listen') speak(ex.answer); if (ex.speakPrompt) speak(ex.prompt); }, [ex]);

  function check(ok) {
    setChecked({ ok }); ding(ok); onAnswer(ok);
    if (ok && (ex.speakAnswer || ex.type === 'build')) speak(ex.answer);
  }
  const submit = () => {
    if (ex.type === 'choose' || ex.type === 'listen') check(pick === ex.answer);
    if (ex.type === 'build') check(sameAnswer(built.map((i) => ex.tiles[i]).join(' '), ex.answer));
  };
  async function record() {
    setBusy(true);
    try {
      const alts = await listenOnce();
      const list = [].concat(alts || []);
      const best = list.length ? Math.max(...list.map((a) => similarity(a, ex.answer))) : 0;
      setHeard({ text: list[0] || '', score: best });
      if (list.length && best >= 60) check(true);
    } catch (e) { setHeard({ text: '', score: 0, err: e.message }); }
    setBusy(false);
  }
  function tapMatch(side, val) {
    if (side === 'en') { setMatchSel(val); return; }
    if (!matchSel) return;
    const pair = ex.pairs.find((p) => p.en === matchSel);
    if (pair.or === val) {
      const m = [...matched, matchSel]; setMatched(m); setMatchSel(null); ding(true); speak(pair.en);
      if (m.length === ex.pairs.length) { setChecked({ ok: !mistake }); onAnswer(!mistake); }
    } else { setWrongPair(val); setMistake(true); ding(false); setTimeout(() => setWrongPair(null), 500); }
  }

  const canCheck = (ex.type === 'build' && built.length) || ((ex.type === 'choose' || ex.type === 'listen') && pick);
  const title = { choose: ex.answerOdia ? 'What does this mean?' : 'Choose the right English', build: 'Make the sentence in English', listen: 'What did you hear?', speak: 'Say this sentence', match: 'Match the pairs' }[ex.type];

  return (
    <div className="exercise pop">
      {ex.retry && <p className="retry-tag">↻ Previous mistake</p>}
      <h3>{title}</h3>

      {ex.type === 'choose' && (
        <>
          <div className="prompt-bubble"><button className="speaker sm" onClick={() => speak(ex.promptOdia ? ex.answer : ex.prompt)}>🔊</button><span className={ex.promptOdia ? 'odia' : ''}>{ex.prompt}</span></div>
          <div className="options">{ex.options.map((o) => <button key={o} disabled={Boolean(checked)} className={`option ${pick === o ? 'sel' : ''} ${checked && o === ex.answer ? 'right' : ''} ${ex.answerOdia ? 'odia' : ''}`} onClick={() => setPick(o)}>{o}</button>)}</div>
        </>
      )}

      {ex.type === 'listen' && (
        <>
          <div className="row gap center"><button className="speaker xl" onClick={() => speak(ex.answer)}>🔊</button><button className="speaker" onClick={() => speak(ex.answer, { rate: 0.6 })}>🐢</button></div>
          <div className="options">{ex.options.map((o) => <button key={o} disabled={Boolean(checked)} className={`option ${pick === o ? 'sel' : ''} ${checked && o === ex.answer ? 'right' : ''}`} onClick={() => setPick(o)}>{o}</button>)}</div>
        </>
      )}

      {ex.type === 'build' && (
        <>
          <div className="prompt-bubble"><span className={ex.promptOdia ? 'odia' : ''}>{ex.prompt}</span></div>
          <div className="answer-line">{built.map((i, k) => <button key={k} className="tile-w" disabled={Boolean(checked)} onClick={() => setBuilt(built.filter((_, j) => j !== k))}>{ex.tiles[i]}</button>)}</div>
          <div className="tiles">{ex.tiles.map((t, i) => <button key={i} className={`tile-w ${built.includes(i) ? 'used' : ''}`} disabled={built.includes(i) || Boolean(checked)} onClick={() => setBuilt([...built, i])}>{t}</button>)}</div>
        </>
      )}

      {ex.type === 'speak' && (
        <>
          <div className="prompt-bubble"><button className="speaker sm" onClick={() => speak(ex.answer)}>🔊</button><div><b>{ex.answer}</b>{ex.hint && <div className="odia muted small">{ex.hint}</div>}</div></div>
          {canListen() ? (
            <div className="center-text">
              <button className={`orb ${busy ? 'live' : ''}`} onClick={record} disabled={busy || Boolean(checked)}>{busy ? '…' : '🎙️'}</button>
              <p className="small muted">{busy ? 'Listening… speak now' : 'Tap and say the sentence'}</p>
              {heard && !checked && <Score heard={heard} />}
              {!checked && <button className="link small" onClick={() => { setChecked({ ok: true, skipped: true }); onAnswer(true); }}>Can't speak now</button>}
            </div>
          ) : (
            <div className="center-text">
              <p className="small muted">Read it aloud 3 times, then continue. (Voice check works in Chrome and the Android app.)</p>
              {!checked && <button className="btn btn-ghost" onClick={() => { setChecked({ ok: true, skipped: true }); onAnswer(true); }}>I said it ✓</button>}
            </div>
          )}
        </>
      )}

      {ex.type === 'match' && (
        <div className="match">
          <div>{ex.pairs.map((p) => <button key={p.en} className={`option ${matchSel === p.en ? 'sel' : ''} ${matched.includes(p.en) ? 'gone' : ''}`} disabled={matched.includes(p.en)} onClick={() => { speak(p.en); tapMatch('en', p.en); }}>{p.en}</button>)}</div>
          <div>{right.map((o) => { const done = matched.some((m) => ex.pairs.find((p) => p.en === m).or === o); return <button key={o} className={`option odia ${done ? 'gone' : ''} ${wrongPair === o ? 'shake' : ''}`} disabled={done} onClick={() => tapMatch('or', o)}>{o}</button>; })}</div>
        </div>
      )}

      <div className={`lesson-foot ${checked ? (checked.ok ? 'good' : 'bad') : ''}`}>
        {checked && !checked.skipped && (
          <div className="feedback">
            <b>{checked.ok ? ['Great job! 🎉', 'Correct! ✅', 'Excellent! ⭐', 'ବହୁତ ଭଲ! 👏'][Math.floor(Math.random() * 4)] : 'Not quite.'}</b>
            {!checked.ok && ex.answer && <div>Correct answer: <span className={ex.answerOdia ? 'odia' : ''}>{ex.answer}</span> {!ex.answerOdia && <button className="link" onClick={() => speak(ex.answer)}>🔊</button>}</div>}
          </div>
        )}
        {checked ? <button className="btn btn-lg btn-block" onClick={onNext}>Continue</button>
          : ex.type === 'speak' || ex.type === 'match' ? null
            : <button className="btn btn-lg btn-block" disabled={!canCheck} onClick={submit}>Check</button>}
      </div>
    </div>
  );
}
