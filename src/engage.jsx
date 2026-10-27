// Engagement layer: learner stats context, speech helpers (TTS + speech recognition), reminders, sounds.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

const Ctx = createContext(null);

export function EngageProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const refresh = useCallback(() => api('/me/stats').then((d) => { setData(d); return d; }).catch(() => null), []);
  useEffect(() => { refresh(); }, [user, refresh]);
  return <Ctx.Provider value={{ data, stats: data?.stats, refresh }}>{children}</Ctx.Provider>;
}
export const useEngage = () => useContext(Ctx);

/* ---------- Text to speech (free, on-device) ---------- */
let voices = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const load = () => { voices = window.speechSynthesis.getVoices(); };
  load(); window.speechSynthesis.onvoiceschanged = load;
}
export function speak(text, { lang = 'en-IN', rate = 0.9 } = {}) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, ' '));
  u.lang = lang; u.rate = rate;
  const v = voices.find((x) => x.lang === lang) || voices.find((x) => x.lang?.startsWith(lang.split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

/* ---------- Speech recognition (pronunciation check) ---------- */
export const canListen = () => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
export function listenOnce({ lang = 'en-IN', timeoutMs = 7000 } = {}) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error('Speech recognition is not supported on this device.'));
    const rec = new SR();
    rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 3;
    let done = false;
    const finish = (fn, v) => { if (!done) { done = true; clearTimeout(t); try { rec.stop(); } catch { /* */ } fn(v); } };
    const t = setTimeout(() => finish(resolve, ''), timeoutMs);
    rec.onresult = (e) => finish(resolve, [...e.results[0]].map((a) => a.transcript));
    rec.onerror = (e) => finish(e.error === 'no-speech' ? resolve : reject, e.error === 'no-speech' ? '' : new Error(e.error));
    rec.onend = () => finish(resolve, '');
    rec.start();
  });
}

const norm = (s) => s.toLowerCase().replace(/\.\.\.|…/g, ' ').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
// Word-level similarity 0..100 between what was said and the target.
export function similarity(said, target) {
  const a = norm(said).split(' ').filter(Boolean);
  const b = norm(target).split(' ').filter(Boolean);
  if (!b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
  return Math.round((dp[a.length][b.length] / Math.max(b.length, a.length)) * 100);
}
export const sameAnswer = (a, b) => norm(a) === norm(b);

/* ---------- Little sounds (WebAudio, no files) ---------- */
let ac;
export function ding(ok = true) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    const now = ac.currentTime;
    o.frequency.setValueAtTime(ok ? 660 : 220, now);
    if (ok) o.frequency.setValueAtTime(880, now + 0.09);
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o.start(now); o.stop(now + 0.3);
  } catch { /* */ }
  if (navigator.vibrate) navigator.vibrate(ok ? 15 : [30, 40, 30]);
}

/* ---------- Daily reminders on the device ---------- */
// Android app: a real daily local notification. Web: browser notification while the app/tab is open,
// plus email reminders from the server for signed-in learners.
export async function scheduleDeviceReminder(enabled, time = '19:00', streak = 0) {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }] }).catch(() => {});
    if (!enabled) return 'off';
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return 'denied';
    const [hour, minute] = time.split(':').map(Number);
    await LocalNotifications.schedule({
      notifications: [{
        id: 1001,
        title: streak ? `🔥 Keep your ${streak}-day streak!` : 'Time to practise English 🎙️',
        body: 'Five minutes with Kathai today. ଆଜି ୫ ମିନିଟ୍ ଇଂରାଜୀ କହନ୍ତୁ!',
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      }],
    });
    return 'scheduled';
  }
  if (!enabled || !('Notification' in window)) return 'off';
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  localStorage.setItem('kathai_reminder', JSON.stringify({ enabled, time }));
  return p === 'granted' ? 'browser' : 'denied';
}

// Web fallback: if the app is open past reminder time and nothing done today, nudge once.
export function startWebReminderWatch(getStats) {
  if (Capacitor.isNativePlatform() || !('Notification' in window)) return () => {};
  const check = () => {
    const cfg = JSON.parse(localStorage.getItem('kathai_reminder') || 'null');
    const s = getStats();
    if (!cfg?.enabled || !s || s.activeToday || Notification.permission !== 'granted') return;
    const now = new Date(); const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const key = `kathai_nudged_${now.toDateString()}`;
    if (hhmm >= cfg.time && !localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      new Notification(s.streak ? `🔥 Keep your ${s.streak}-day streak!` : 'Time to practise English 🎙️', { body: 'Five minutes with Kathai today.', icon: '/icon.svg' });
    }
  };
  const t = setInterval(check, 60_000); check();
  return () => clearInterval(t);
}

export const MOTIVATIONS = [
  { id: 'job', icon: '💼', en: 'Get a job / grow my career', or: 'ଚାକିରି ଓ କ୍ୟାରିୟର' },
  { id: 'study', icon: '🎓', en: 'Studies and exams', or: 'ପଢ଼ା ଓ ପରୀକ୍ଷା' },
  { id: 'confidence', icon: '💪', en: 'Speak with confidence', or: 'ଆତ୍ମବିଶ୍ୱାସରେ କହିବା' },
  { id: 'travel', icon: '✈️', en: 'Travel and moving cities', or: 'ଯାତ୍ରା ଓ ବାହାରେ ରହିବା' },
  { id: 'daily', icon: '🏠', en: 'Daily life', or: 'ଦୈନନ୍ଦିନ ଜୀବନ' },
];
export const GOALS = [
  { xp: 10, label: 'Casual', min: 5 },
  { xp: 20, label: 'Regular', min: 10 },
  { xp: 30, label: 'Serious', min: 15 },
  { xp: 50, label: 'Intense', min: 20 },
];
// Suggested first course by motivation and level (Busuu-style personalised study plan).
export function suggestCourse(motivation, level) {
  if (level === 'new') return 'english-etiquette';
  if (motivation === 'job') return level === 'good' ? 'job-interview-english' : 'everyday-grammar-for-speaking';
  if (motivation === 'study') return 'everyday-grammar-for-speaking';
  if (motivation === 'travel') return 'shopping-travel-directions';
  if (motivation === 'confidence') return level === 'good' ? 'opinions-and-storytelling' : 'pronunciation-for-odia-speakers';
  return 'day-to-day-conversation';
}
