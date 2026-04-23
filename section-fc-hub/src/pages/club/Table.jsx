import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';

const EMPTY_ROW = { team: '', p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

export default function Table() {
  const { club, clubId, isAdmin } = useClub();
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clubs', clubId, 'league', 'table'), snap => {
      if (snap.exists()) setRows(snap.data().rows || []);
      else setRows([]);
    });
    return unsub;
  }, [clubId]);

  function sorted(list) {
    return [...list].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  }

  async function save(newRows) {
    await setDoc(doc(db, 'clubs', clubId, 'league', 'table'), {
      rows: newRows.map(r => ({
        team: String(r.team || '').trim(),
        p: Number(r.p) || 0,
        w: Number(r.w) || 0,
        d: Number(r.d) || 0,
        l: Number(r.l) || 0,
        gf: Number(r.gf) || 0,
        ga: Number(r.ga) || 0,
        pts: Number(r.pts) || 0,
      })).filter(r => r.team),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  function startEdit() {
    setDraft(rows.length ? rows.map(r => ({ ...r })) : [{ ...EMPTY_ROW, team: club.name }]);
    setEditing(true);
  }

  function updateDraft(i, k, v) {
    const next = draft.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    setDraft(next);
  }

  function addRow() {
    setDraft([...draft, { ...EMPTY_ROW }]);
  }

  function removeRow(i) {
    setDraft(draft.filter((_, idx) => idx !== i));
  }

  async function onSave() {
    await save(draft);
    setEditing(false);
  }

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <div className="eyebrow">Standings</div>
          <h1>League Table</h1>
          {club.league && <div className="pill">{club.league}</div>}
        </div>
        {isAdmin && !editing && <button className="btn" onClick={startEdit}>{rows.length ? 'Edit table' : 'Set up table'}</button>}
      </div>

      {editing
        ? <div className="card">
            <div className="card-head">
              <div className="card-title">Edit standings</div>
              <button className="btn btn-sm" onClick={addRow}>+ Add team</button>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th><th></th></tr>
              </thead>
              <tbody>
                {draft.map((r, i) => (
                  <tr key={i}>
                    <td><input className="input" style={{ minWidth: 140 }} value={r.team} onChange={e => updateDraft(i, 'team', e.target.value)} placeholder="Team name" /></td>
                    {['p','w','d','l','gf','ga','pts'].map(k => (
                      <td key={k}><input className="input stat-input" type="number" value={r[k]} onChange={e => updateDraft(i, k, e.target.value)} /></td>
                    ))}
                    <td><button className="btn btn-ghost btn-sm" onClick={() => removeRow(i)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: '.8rem' }}>
              <button className="btn" onClick={onSave}>Save</button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        : rows.length === 0
          ? <div className="empty">
              <h3>No table set up</h3>
              {isAdmin ? <><p>Add your league standings manually.</p><button className="btn" onClick={startEdit}>Set up table</button></>
                       : <p>Admins haven&apos;t set up the league table yet.</p>}
            </div>
          : <div className="card" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>#</th><th>Team</th><th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num">GF</th><th className="num">GA</th><th className="num">GD</th><th className="num">Pts</th></tr>
                </thead>
                <tbody>
                  {sorted(rows).map((r, i) => {
                    const isUs = r.team?.toLowerCase() === club.name?.toLowerCase();
                    return (
                      <tr key={r.team + i} style={isUs ? { background: 'var(--primary-dim)' } : {}}>
                        <td className="muted">{i + 1}</td>
                        <td><strong style={{ color: isUs ? 'var(--primary)' : 'inherit' }}>{r.team}</strong></td>
                        <td className="num">{r.p}</td>
                        <td className="num">{r.w}</td>
                        <td className="num">{r.d}</td>
                        <td className="num">{r.l}</td>
                        <td className="num">{r.gf}</td>
                        <td className="num">{r.ga}</td>
                        <td className="num">{r.gf - r.ga}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{r.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      }
    </div>
  );
}
