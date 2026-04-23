import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

const DEFAULT_AWARDS = [
  { id: 'golden_boot', name: 'Golden Boot', icon: '⚽', color: '#FFD700', hint: 'Top scorer' },
  { id: 'assist_king', name: 'Assist King', icon: '👑', color: '#e8ff00', hint: 'Most assists' },
  { id: 'mr_reliable', name: 'Mr. Reliable', icon: '🛡️', color: '#60cfff', hint: 'Most appearances' },
  { id: 'danger_man', name: 'Danger Man', icon: '🟨', color: '#ff5544', hint: 'Most yellows' },
  { id: 'safe_hands', name: 'Safe Hands', icon: '🧤', color: '#44dd88', hint: 'Most clean sheets' },
];

export default function HallOfFame() {
  const { clubId, players, isAdmin } = useClub();
  const [awards, setAwards] = useState([]);
  const [initialising, setInitialising] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clubs', clubId, 'awards'), s => {
      setAwards(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [clubId]);

  async function initDefaults() {
    setInitialising(true);
    for (const a of DEFAULT_AWARDS) {
      await setDoc(doc(db, 'clubs', clubId, 'awards', a.id), { ...a, winner: null }, { merge: true });
    }
    setInitialising(false);
  }

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <div className="eyebrow">Recognition</div>
          <h1>Hall of Fame</h1>
        </div>
        {isAdmin && <button className="btn" onClick={() => setCreating(true)}>+ New award</button>}
      </div>

      {awards.length === 0 && !creating
        ? <div className="empty">
            <h3>No awards yet</h3>
            {isAdmin
              ? <><p>Start with the classics or design your own.</p>
                  <div className="row" style={{ justifyContent:'center' }}>
                    <button className="btn" onClick={initDefaults} disabled={initialising}>{initialising ? 'Adding…' : 'Add 5 default awards'}</button>
                    <button className="btn btn-ghost" onClick={() => setCreating(true)}>Create custom</button>
                  </div></>
              : <p>Admins haven&apos;t set up any awards yet.</p>}
          </div>
        : <div className="grid-auto">
            {creating && <AwardForm clubId={clubId} onDone={() => setCreating(false)} />}
            {awards.map(a => (
              editing === a.id
                ? <AwardForm key={a.id} clubId={clubId} award={a} onDone={() => setEditing(null)} />
                : <AwardCard key={a.id} award={a} players={players} isAdmin={isAdmin}
                    onSetWinner={async (w) => setDoc(doc(db, 'clubs', clubId, 'awards', a.id), { winner: w || null }, { merge: true })}
                    onEdit={() => setEditing(a.id)}
                    onDelete={() => { if (confirm(`Delete ${a.name}?`)) deleteDoc(doc(db, 'clubs', clubId, 'awards', a.id)); }}
                  />
            ))}
          </div>
      }
    </div>
  );
}

function AwardCard({ award, players, isAdmin, onSetWinner, onEdit, onDelete }) {
  const winner = players.find(p => p.name === award.winner);
  return (
    <div className="card" style={{ borderColor: award.color || 'var(--border)' }}>
      <div className="row-between">
        <div style={{ fontSize: '2.4rem' }}>{award.icon || '🏆'}</div>
        {isAdmin && <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete}>×</button>
        </div>}
      </div>
      <h3 style={{ color: award.color || 'var(--primary)', marginTop: '.3rem' }}>{award.name}</h3>
      {award.hint && <div className="tiny muted">{award.hint}</div>}
      <div className="divider" />
      {winner
        ? <div className="row">
            <PlayerAvatar name={winner.name} photoUrl={winner.photoUrl} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{winner.name}</div>
          </div>
        : <div className="muted">No winner yet.</div>
      }
      {isAdmin && (
        <select className="select" style={{ marginTop: '.7rem' }} value={award.winner || ''} onChange={e => onSetWinner(e.target.value)}>
          <option value="">— Choose winner —</option>
          {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      )}
    </div>
  );
}

function AwardForm({ clubId, award, onDone }) {
  const [name, setName] = useState(award?.name || '');
  const [icon, setIcon] = useState(award?.icon || '🏆');
  const [color, setColor] = useState(award?.color || '#e8ff00');
  const [hint, setHint] = useState(award?.hint || '');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const id = award?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    await setDoc(doc(db, 'clubs', clubId, 'awards', id), {
      name: name.trim(), icon, color, hint, winner: award?.winner || null,
    }, { merge: true });
    setBusy(false);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="card stack-sm">
      <div className="card-title">{award ? 'Edit award' : 'New award'}</div>
      <div className="field">
        <label className="label">Name</label>
        <input className="input" required value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label">Icon (emoji)</label>
          <input className="input" value={icon} onChange={e => setIcon(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Color</label>
          <input className="input" type="color" value={color} onChange={e => setColor(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label">Hint</label>
        <input className="input" value={hint} onChange={e => setHint(e.target.value)} placeholder="What this award is for" />
      </div>
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
