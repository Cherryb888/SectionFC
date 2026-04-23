import React, { useState } from 'react';
import { useClub } from '../../clubs/ClubProvider.jsx';
import { addPlayer, updatePlayer, removePlayer } from '../../clubs/clubService.js';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];

export default function Squad() {
  const { clubId, players, isAdmin } = useClub();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <div className="eyebrow">Roster</div>
          <h1>Squad</h1>
        </div>
        {isAdmin && <button className="btn" onClick={() => setAdding(true)}>+ Add player</button>}
      </div>

      {players.length === 0 && !adding && (
        <div className="empty">
          <h3>No players yet</h3>
          {isAdmin
            ? <><p>Build your squad. Names are used across stats, predictors, and reports.</p>
                <button className="btn" onClick={() => setAdding(true)}>Add your first player</button></>
            : <p>Admins haven&apos;t added any players yet.</p>
          }
        </div>
      )}

      {adding && <PlayerForm clubId={clubId} onDone={() => setAdding(false)} />}

      <div className="grid-auto">
        {players.map(p => (
          editing === p.id
            ? <PlayerForm key={p.id} clubId={clubId} player={p} onDone={() => setEditing(null)} />
            : <div key={p.id} className="card">
                <div className="row" style={{ gap:'.8rem' }}>
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="lg" />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize: '1.1rem' }}>{p.name}</div>
                    <div className="tiny muted">
                      {p.position || '—'} {p.number ? `· #${p.number}` : ''}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="row" style={{ marginTop: '.7rem', gap:'.4rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p.id)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      if (confirm(`Remove ${p.name}? This does not delete their historical stats.`)) {
                        await removePlayer(clubId, p.id);
                      }
                    }}>Remove</button>
                  </div>
                )}
              </div>
        ))}
      </div>
    </div>
  );
}

function PlayerForm({ clubId, player, onDone }) {
  const [name, setName] = useState(player?.name || '');
  const [position, setPosition] = useState(player?.position || '');
  const [number, setNumber] = useState(player?.number || '');
  const [photoUrl, setPhotoUrl] = useState(player?.photoUrl || '');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const patch = { name: name.trim(), position, number: number ? Number(number) : null, photoUrl: photoUrl.trim() };
    if (player) await updatePlayer(clubId, player.id, patch);
    else await addPlayer(clubId, patch);
    setBusy(false);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="card stack-sm">
      <div className="card-title">{player ? 'Edit player' : 'Add player'}</div>
      <div className="field">
        <label className="label">Name</label>
        <input className="input" required value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label">Position</label>
          <select className="select" value={position} onChange={e => setPosition(e.target.value)}>
            <option value="">—</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">Number</label>
          <input className="input" type="number" min={1} max={99} value={number} onChange={e => setNumber(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label">Photo URL (optional)</label>
        <input className="input" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
