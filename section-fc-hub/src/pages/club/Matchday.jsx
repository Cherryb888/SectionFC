import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

export default function Matchday() {
  const { club, clubId, players, isAdmin } = useClub();
  const [squad, setSquad] = useState({ squadPlayers: [], starters: [], bench: [], oppName: '', published: false });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clubs', clubId, 'matchday', 'squad'), s => {
      if (s.exists()) setSquad({
        squadPlayers: [],
        starters: [],
        bench: [],
        published: false,
        oppName: '',
        ...s.data(),
      });
    });
    return unsub;
  }, [clubId]);

  if (!isAdmin) return <Navigate to=".." replace />;

  const squadSize = club.squadSize || 5;

  function togglePool(name) {
    setSquad(s => ({
      ...s,
      squadPlayers: s.squadPlayers.includes(name)
        ? s.squadPlayers.filter(n => n !== name)
        : [...s.squadPlayers, name],
    }));
  }
  function toggleStarter(name) {
    setSquad(s => {
      if (s.starters.includes(name)) return { ...s, starters: s.starters.filter(n => n !== name) };
      if (s.starters.length >= squadSize) return s;
      return { ...s, starters: [...s.starters, name], bench: s.bench.filter(n => n !== name) };
    });
  }
  function toggleBench(name) {
    setSquad(s => {
      if (s.bench.includes(name)) return { ...s, bench: s.bench.filter(n => n !== name) };
      return { ...s, bench: [...s.bench, name], starters: s.starters.filter(n => n !== name) };
    });
  }

  async function save(published) {
    await setDoc(doc(db, 'clubs', clubId, 'matchday', 'squad'), {
      ...squad,
      published,
      publishedAt: published ? serverTimestamp() : null,
    }, { merge: true });
  }

  const poolPlayers = players.filter(p => squad.squadPlayers.includes(p.name));

  return (
    <div className="stack-lg">
      <div>
        <div className="eyebrow">Pre-match</div>
        <h1>Matchday Setup</h1>
        <p className="muted">Pick the matchday squad, assign starters and bench, publish the lineup.</p>
      </div>

      <div className="card">
        <div className="card-title">Opponent</div>
        <input className="input" value={squad.oppName} onChange={e => setSquad(s => ({ ...s, oppName: e.target.value }))} placeholder="Opponent name" />
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">1 · Squad pool ({squad.squadPlayers.length})</div>
        </div>
        <div className="grid-auto" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {players.map(p => {
            const sel = squad.squadPlayers.includes(p.name);
            return (
              <button key={p.id} type="button" className="card" style={{
                padding:'.5rem', cursor:'pointer',
                borderColor: sel ? 'var(--primary)' : 'var(--border)',
                background: sel ? 'var(--primary-dim)' : 'var(--bg-card)',
              }} onClick={() => togglePool(p.name)}>
                <div className="row">
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                  <strong>{p.name}</strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">2 · Starting {squadSize} ({squad.starters.length}/{squadSize})</div>
        </div>
        <div className="grid-auto" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {poolPlayers.map(p => {
            const sel = squad.starters.includes(p.name);
            return (
              <button key={p.id} type="button" className="card" style={{
                padding:'.5rem', cursor:'pointer',
                borderColor: sel ? 'var(--primary)' : 'var(--border)',
                background: sel ? 'var(--primary-dim)' : 'var(--bg-card)',
              }} onClick={() => toggleStarter(p.name)}>
                <div className="row">
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                  <strong>{p.name}</strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">3 · Bench ({squad.bench.length})</div>
        </div>
        <div className="grid-auto" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {poolPlayers.filter(p => !squad.starters.includes(p.name)).map(p => {
            const sel = squad.bench.includes(p.name);
            return (
              <button key={p.id} type="button" className="card" style={{
                padding:'.5rem', cursor:'pointer',
                borderColor: sel ? 'var(--accent)' : 'var(--border)',
                background: sel ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'var(--bg-card)',
              }} onClick={() => toggleBench(p.name)}>
                <div className="row">
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                  <strong>{p.name}</strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={() => save(true)}>Publish lineup</button>
        <button className="btn btn-ghost" onClick={() => save(false)}>Save draft</button>
        {squad.published && <span className="pill">Published</span>}
      </div>

      {squad.published && (
        <div className="card">
          <div className="card-title">Preview (what the club sees)</div>
          <div className="row-between" style={{ marginTop: '.6rem' }}>
            <div>
              <div className="tiny muted">{club.name}</div>
              <div style={{ fontWeight:700, fontSize:'1.2rem' }}>Starting {squadSize}</div>
              <div className="stack-sm" style={{ marginTop: '.5rem' }}>
                {squad.starters.map(n => (
                  <div key={n} className="row">
                    <PlayerAvatar name={n} photoUrl={players.find(p => p.name === n)?.photoUrl} size="sm" />
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="tiny muted">Opponent</div>
              <div style={{ fontWeight:700, fontSize:'1.2rem' }}>{squad.oppName || '—'}</div>
              <div className="stack-sm" style={{ marginTop: '.5rem' }}>
                {squad.bench.length > 0 && <div className="tiny muted">Bench</div>}
                {squad.bench.map(n => (
                  <div key={n} className="row" style={{ justifyContent:'flex-end' }}>
                    <strong>{n}</strong>
                    <PlayerAvatar name={n} photoUrl={players.find(p => p.name === n)?.photoUrl} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
