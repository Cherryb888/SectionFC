import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { createClub, isSlugAvailable, slugify } from '../clubs/clubService.js';
import { applyTheme } from '../theme/applyTheme.js';

const PRESETS = [
  { name: 'Neon Yellow', primary: '#e8ff00', accent: '#ff7755' },
  { name: 'Classic Red', primary: '#ff3344', accent: '#ffaa00' },
  { name: 'Royal Blue', primary: '#3b82f6', accent: '#fbbf24' },
  { name: 'Forest', primary: '#22c55e', accent: '#ef4444' },
  { name: 'Sky', primary: '#38bdf8', accent: '#f97316' },
  { name: 'Violet', primary: '#a855f7', accent: '#f59e0b' },
];

export default function CreateClub() {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [preset, setPreset] = useState(0);
  const [crestUrl, setCrestUrl] = useState('');
  const [squadSize, setSquadSize] = useState(5);
  const [league, setLeague] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function onNameChange(v) {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  }

  function previewTheme(i) {
    setPreset(i);
    applyTheme({ primary: PRESETS[i].primary, accent: PRESETS[i].accent });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    const cleanSlug = slugify(slug);
    if (cleanSlug.length < 3) { setErr('Slug must be at least 3 characters.'); return; }
    setBusy(true);
    try {
      if (!await isSlugAvailable(cleanSlug)) {
        setErr('That URL is taken. Try another.');
        setBusy(false);
        return;
      }
      const p = PRESETS[preset];
      await createClub({
        owner: user,
        name,
        slug: cleanSlug,
        tagline,
        primary: p.primary,
        accent: p.accent,
        crestUrl,
        squadSize: Number(squadSize) || 5,
        league,
      });
      await refreshProfile();
      nav(`/c/${cleanSlug}/squad`, { replace: true });
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="narrow" style={{ paddingTop: '3rem' }}>
      <div className="eyebrow">Onboarding</div>
      <h1>Create your club</h1>
      <p className="muted">You can tweak anything in Settings later.</p>
      <form onSubmit={onSubmit} className="card stack-md">
        <div className="field">
          <label className="label">Club name</label>
          <input className="input" required value={name} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Section FC" autoFocus />
        </div>
        <div className="field">
          <label className="label">Club URL</label>
          <div className="row" style={{ gap:'.3rem' }}>
            <span className="muted tiny">sectioned.app/c/</span>
            <input className="input" required value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="section-fc" />
          </div>
        </div>
        <div className="field">
          <label className="label">Tagline (optional)</label>
          <input className="input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Play With Your Heart On Your Sleeve" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label">Squad size</label>
            <select className="select" value={squadSize} onChange={e => setSquadSize(e.target.value)}>
              <option value={5}>5-a-side</option>
              <option value={7}>7-a-side</option>
              <option value={9}>9-a-side</option>
              <option value={11}>11-a-side</option>
            </select>
          </div>
          <div className="field">
            <label className="label">League (optional)</label>
            <input className="input" value={league} onChange={e => setLeague(e.target.value)} placeholder="e.g. Monday Night Premier" />
          </div>
        </div>
        <div className="field">
          <label className="label">Crest image URL (optional)</label>
          <input className="input" value={crestUrl} onChange={e => setCrestUrl(e.target.value)} placeholder="https://…/crest.png" />
        </div>
        <div className="field">
          <label className="label">Color theme</label>
          <div className="grid-3">
            {PRESETS.map((p, i) => (
              <button key={p.name} type="button"
                onClick={() => previewTheme(i)}
                className="card"
                style={{
                  padding: '.7rem',
                  cursor:'pointer',
                  borderColor: preset === i ? p.primary : 'var(--border)',
                  textAlign: 'left',
                }}>
                <div className="row" style={{ gap:'.3rem' }}>
                  <span style={{ width:18, height:18, borderRadius:'50%', background: p.primary, display:'inline-block', border:'1px solid var(--border)' }} />
                  <span style={{ width:18, height:18, borderRadius:'50%', background: p.accent, display:'inline-block', border:'1px solid var(--border)' }} />
                </div>
                <div style={{ marginTop: '.3rem', fontWeight: 700 }}>{p.name}</div>
              </button>
            ))}
          </div>
        </div>
        {err && <div style={{ color: 'var(--loss)' }}>{err}</div>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create club'}</button>
        <div className="muted tiny" style={{ textAlign:'center' }}>
          <Link to="/app">Back to my clubs</Link>
        </div>
      </form>
    </div>
  );
}
