import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import { applyTheme } from '../../theme/applyTheme.js';

export default function Settings() {
  const { club, clubId, isOwner, isAdmin } = useClub();
  const nav = useNavigate();
  const [name, setName] = useState(club.name);
  const [tagline, setTagline] = useState(club.tagline || '');
  const [league, setLeague] = useState(club.league || '');
  const [crestUrl, setCrestUrl] = useState(club.crestUrl || '');
  const [primary, setPrimary] = useState(club.colors?.primary || '#e8ff00');
  const [accent, setAccent] = useState(club.colors?.accent || '#ff7755');
  const [squadSize, setSquadSize] = useState(club.squadSize || 5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isAdmin) return <Navigate to=".." replace />;

  function preview() { applyTheme({ primary, accent }); }

  async function save() {
    setSaving(true);
    await updateDoc(doc(db, 'clubs', clubId), {
      name: name.trim(),
      tagline,
      league,
      crestUrl,
      colors: { primary, accent },
      squadSize: Number(squadSize) || 5,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function onDelete() {
    if (!isOwner) { alert('Only the owner can delete the club.'); return; }
    if (!confirm(`Really delete ${club.name}? This cannot be undone.`)) return;
    if (prompt(`Type the club name to confirm.`) !== club.name) return;
    await deleteDoc(doc(db, 'clubs', clubId));
    nav('/app');
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <div>
        <div className="eyebrow">Admin</div>
        <h1>Club Settings</h1>
      </div>

      <div className="card stack-sm">
        <div className="card-title">Identity</div>
        <div className="field">
          <label className="label">Club name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Tagline</label>
          <input className="input" value={tagline} onChange={e => setTagline(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">League</label>
          <input className="input" value={league} onChange={e => setLeague(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Crest image URL</label>
          <input className="input" value={crestUrl} onChange={e => setCrestUrl(e.target.value)} />
        </div>
      </div>

      <div className="card stack-sm">
        <div className="card-title">Branding</div>
        <div className="grid-2">
          <div className="field">
            <label className="label">Primary color</label>
            <input className="input" type="color" value={primary} onChange={e => { setPrimary(e.target.value); applyTheme({ primary: e.target.value, accent }); }} />
          </div>
          <div className="field">
            <label className="label">Accent color</label>
            <input className="input" type="color" value={accent} onChange={e => { setAccent(e.target.value); applyTheme({ primary, accent: e.target.value }); }} />
          </div>
        </div>
        <div><button className="btn btn-ghost btn-sm" type="button" onClick={preview}>Preview theme</button></div>
      </div>

      <div className="card stack-sm">
        <div className="card-title">Match format</div>
        <div className="field">
          <label className="label">Squad size (starters)</label>
          <select className="select" value={squadSize} onChange={e => setSquadSize(e.target.value)}>
            <option value={5}>5-a-side</option>
            <option value={7}>7-a-side</option>
            <option value={9}>9-a-side</option>
            <option value={11}>11-a-side</option>
          </select>
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        {saved && <span className="pill">Saved</span>}
      </div>

      {isOwner && (
        <div className="card" style={{ borderColor: 'var(--loss)' }}>
          <div className="card-title" style={{ color: 'var(--loss)' }}>Danger zone</div>
          <p className="muted">Deleting the club is permanent. All data is lost.</p>
          <button className="btn btn-danger" onClick={onDelete}>Delete club</button>
        </div>
      )}
    </div>
  );
}
