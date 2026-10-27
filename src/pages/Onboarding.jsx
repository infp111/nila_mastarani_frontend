// First-run onboarding (Duolingo/Busuu-style): why, level, daily goal, reminder -> personalised plan.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useEngage, MOTIVATIONS, GOALS, suggestCourse, scheduleDeviceReminder } from '../engage.jsx';

const LEVELS = [
  { id: 'new', icon: '🌱', en: "I'm just starting", or: 'ମୁଁ ନୂଆ ଶିଖୁଛି' },
  { id: 'some', icon: '🌿', en: 'I know some English but hesitate to speak', or: 'କିଛି ଜାଣେ, କହିବାକୁ ଡର ଲାଗେ' },
  { id: 'good', icon: '🌳', en: 'I can talk, I want to be fluent and polished', or: 'କହିପାରେ, ଆହୁରି ଭଲ କରିବାକୁ ଚାହେଁ' },
];

export default function Onboarding() {
  const nav = useNavigate();
  const { refresh } = useEngage();
  const [step, setStep] = useState(0);
  const [motivation, setMotivation] = useState(null);
  const [selfLevel, setLevel] = useState(null);
  const [goal, setGoal] = useState(20);
  const [time, setTime] = useState('19:00');
  const [remind, setRemind] = useState(true);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    await api('/me/preferences', { method: 'PUT', body: { motivation, selfLevel, dailyGoal: goal, reminderEnabled: remind, reminderTime: time, timezone, onboarded: true } }).catch(() => {});
    await scheduleDeviceReminder(remind, time).catch(() => {});
    localStorage.setItem('kathai_onboarded', '1');
    await refresh();
    nav(`/course/${suggestCourse(motivation, selfLevel)}`, { replace: true });
  }

  const steps = [
    <div key="m">
      <h2>Why do you want to speak English?</h2>
      <p className="odia muted">ଆପଣ କାହିଁକି ଇଂରାଜୀ କହିବାକୁ ଚାହାଁନ୍ତି?</p>
      <div className="choice-list">{MOTIVATIONS.map((m) => (
        <button key={m.id} className={`choice ${motivation === m.id ? 'sel' : ''}`} onClick={() => setMotivation(m.id)}><span>{m.icon}</span><div><b>{m.en}</b><small className="odia">{m.or}</small></div></button>
      ))}</div>
      <button className="btn btn-lg btn-block" disabled={!motivation} onClick={() => setStep(1)}>Continue</button>
    </div>,
    <div key="l">
      <h2>How is your English now?</h2>
      <p className="odia muted">ଆପଣଙ୍କ ଇଂରାଜୀ ଏବେ କେମିତି?</p>
      <div className="choice-list">{LEVELS.map((m) => (
        <button key={m.id} className={`choice ${selfLevel === m.id ? 'sel' : ''}`} onClick={() => setLevel(m.id)}><span>{m.icon}</span><div><b>{m.en}</b><small className="odia">{m.or}</small></div></button>
      ))}</div>
      <button className="btn btn-lg btn-block" disabled={!selfLevel} onClick={() => setStep(2)}>Continue</button>
    </div>,
    <div key="g">
      <h2>Pick a daily goal</h2>
      <p className="odia muted">ପ୍ରତିଦିନ କେତେ ସମୟ ଅଭ୍ୟାସ କରିବେ?</p>
      <div className="choice-list">{GOALS.map((g) => (
        <button key={g.xp} className={`choice row-choice ${goal === g.xp ? 'sel' : ''}`} onClick={() => setGoal(g.xp)}><b>{g.label}</b><span className="muted">{g.min} min / day · {g.xp} XP</span></button>
      ))}</div>
      <p className="small muted">Learners who practise a little every day improve fastest. You can change this anytime.</p>
      <button className="btn btn-lg btn-block" onClick={() => setStep(3)}>Continue</button>
    </div>,
    <div key="r">
      <h2>When should we remind you?</h2>
      <p className="odia muted">ଆପଣଙ୍କୁ କେତେବେଳେ ମନେ ପକାଇବୁ?</p>
      <div className="card form">
        <label className="inline check"><input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} /> Remind me to practise every day</label>
        {remind && <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>}
        <p className="small muted">On the Android app you'll get a notification. On the web, sign in to get an email reminder.</p>
      </div>
      <button className="btn btn-lg btn-block" disabled={saving} onClick={finish}>{saving ? 'Building your plan…' : 'Start learning 🚀'}</button>
    </div>,
  ];

  return (
    <main className="container narrow onboarding">
      <div className="lesson-top plain">
        {step > 0 ? <button className="x" onClick={() => setStep(step - 1)}>←</button> : <span className="x" />}
        <div className="bar"><div style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        <button className="link small" onClick={() => { localStorage.setItem('kathai_onboarded', '1'); api('/me/preferences', { method: 'PUT', body: { onboarded: true } }).catch(() => {}); nav('/'); }}>Skip</button>
      </div>
      <div className="pop" key={step}>{steps[step]}</div>
    </main>
  );
}
