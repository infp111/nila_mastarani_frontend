import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const blank = (provider = 'gemini_live', providers = {}) => ({
  name: '', provider, model: providers[provider]?.models?.[0] || '', voice: providers[provider]?.voices?.[0] || '',
  language_code: '', api_key: '', base_url: '', temperature: 0.7, extra_config: '', is_active: 1,
});

function EngineForm({ engine, providers, onSaved, onCancel }) {
  const [e, setE] = useState({ ...engine, api_key: '', extra_config: engine.extra_config && Object.keys(engine.extra_config).length ? JSON.stringify(engine.extra_config, null, 2) : '' });
  const [err, setErr] = useState('');
  const p = providers[e.provider] || { models: [], voices: [] };
  const f = (k) => (ev) => setE({ ...e, [k]: ev.target.type === 'checkbox' ? (ev.target.checked ? 1 : 0) : ev.target.value });

  function changeProvider(ev) {
    const prov = ev.target.value;
    setE({ ...e, provider: prov, model: providers[prov].models[0], voice: providers[prov].voices[0] });
  }

  async function save(ev) {
    ev.preventDefault(); setErr('');
    try {
      if (e.extra_config) JSON.parse(e.extra_config);
      if (e.id) await api(`/admin/engines/${e.id}`, { method: 'PUT', body: e });
      else await api('/admin/engines', { method: 'POST', body: e });
      onSaved();
    } catch (ex) { setErr(ex instanceof SyntaxError ? 'Advanced config must be valid JSON' : ex.message); }
  }

  return (
    <form className="card form" onSubmit={save}>
      <div className="grid2">
        <label>Display name<input required value={e.name} onChange={f('name')} placeholder="Gemini Live – Odia tutor" /></label>
        <label>Provider
          <select value={e.provider} onChange={changeProvider}>
            {Object.entries(providers).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>Model
          <input list={`models-${e.provider}`} required value={e.model} onChange={f('model')} />
          <datalist id={`models-${e.provider}`}>{p.models.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label>Voice
          <input list={`voices-${e.provider}`} value={e.voice || ''} onChange={f('voice')} />
          <datalist id={`voices-${e.provider}`}>{p.voices.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label>API key {engine.api_key_set && <span className="small muted">(saved {engine.api_key_hint}; leave blank to keep)</span>}
          <input type="password" value={e.api_key} onChange={f('api_key')} placeholder={engine.api_key_set ? '••••••••' : 'Paste API key'} autoComplete="off" />
        </label>
        <label>Temperature ({e.temperature})<input type="range" min={0} max={2} step={0.1} value={e.temperature} onChange={f('temperature')} /></label>
        <label>Speech language code <span className="small muted">(optional, e.g. en-IN)</span><input value={e.language_code || ''} onChange={f('language_code')} placeholder="auto" /></label>
        <label>Custom endpoint URL <span className="small muted">(optional)</span><input value={e.base_url || ''} onChange={f('base_url')} placeholder="default" /></label>
      </div>
      <details>
        <summary className="small">Advanced provider config (JSON)</summary>
        <textarea rows={5} className="mono" value={e.extra_config} onChange={f('extra_config')}
          placeholder={e.provider === 'gemini_live' ? '{ "setup": { "realtimeInputConfig": { "automaticActivityDetection": { "silenceDurationMs": 800 } } } }' : '{ "session": { } }'} />
      </details>
      <label className="inline check"><input type="checkbox" checked={Boolean(e.is_active)} onChange={f('is_active')} /> Active</label>
      {p.docs && <p className="small muted">Docs: <a href={p.docs} target="_blank" rel="noreferrer">{p.docs}</a></p>}
      {err && <div className="alert error">{err}</div>}
      <div className="row gap"><button className="btn">Save engine</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export default function Engines() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [test, setTest] = useState({});
  const load = () => api('/admin/engines').then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <p className="muted">Loading…</p>;

  const runTest = async (id) => {
    setTest({ ...test, [id]: { busy: true } });
    const r = await api(`/admin/engines/${id}/test`, { method: 'POST' }).catch((e) => ({ ok: false, message: e.message }));
    setTest((t) => ({ ...t, [id]: r }));
  };
  const makeDefault = async (id) => { await api(`/admin/engines/${id}/default`, { method: 'POST' }); load(); };
  const del = async (en) => {
    if (!confirm(`Delete engine "${en.name}"?`)) return;
    try { await api(`/admin/engines/${en.id}`, { method: 'DELETE' }); load(); } catch (e) { alert(e.message); }
  };

  return (
    <>
      <div className="row between"><h1>AI Engines & Voice</h1><button className="btn" onClick={() => setEditing(blank('gemini_live', data.providers))}>+ Add engine</button></div>
      <p className="muted small">The default engine powers every lesson unless a course picks its own. Switch provider (Gemini Live, OpenAI Realtime…), model, or voice any time; no app update needed. API keys are encrypted in the database and never sent to the app.</p>
      {editing && !editing.id && <EngineForm engine={editing} providers={data.providers} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
      {data.engines.map((en) => (
        editing?.id === en.id ? (
          <EngineForm key={en.id} engine={en} providers={data.providers} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        ) : (
          <div key={en.id} className={`card engine ${en.is_default ? 'default' : ''}`}>
            <div className="grow">
              <div className="row gap wrap">
                <strong>{en.name}</strong>
                {en.is_default ? <span className="tag ok-bg">Default</span> : null}
                {!en.is_active && <span className="tag">Inactive</span>}
              </div>
              <div className="small muted">{data.providers[en.provider]?.label || en.provider} · {en.model} · voice {en.voice || 'default'} · temp {en.temperature} · key {en.api_key_set ? en.api_key_hint : <b className="danger">not set</b>}</div>
              {test[en.id] && <div className={`small ${test[en.id].busy ? 'muted' : test[en.id].ok ? 'ok' : 'danger'}`}>{test[en.id].busy ? 'Testing…' : test[en.id].message}</div>}
            </div>
            <div className="row gap wrap">
              <button className="btn btn-sm btn-ghost" onClick={() => runTest(en.id)}>Test</button>
              {!en.is_default && <button className="btn btn-sm btn-ghost" onClick={() => makeDefault(en.id)}>Make default</button>}
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(en)}>Edit</button>
              {!en.is_default && <button className="link danger" onClick={() => del(en)}>Delete</button>}
            </div>
          </div>
        )
      ))}
    </>
  );
}
