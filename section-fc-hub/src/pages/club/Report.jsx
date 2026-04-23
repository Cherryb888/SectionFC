import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  doc, onSnapshot, setDoc, addDoc, collection, Timestamp, getDoc, deleteField,
} from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

const BLANK = {
  goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: 6.5,
};

export default function Report() {
  const { club, clubId, players, isAdmin } = useClub();
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ourScore, setOurScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [summary, setSummary] = useState('');
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clubs', clubId, 'matchday', 'squad'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (!opponent && d.oppName) setOpponent(d.oppName);
      if (d.squadPlayers && Object.keys(rows).length === 0) {
        const next = {};
        d.squadPlayers.forEach(n => { next[n] = { ...BLANK }; });
        setRows(next);
      }
    });
    return unsub;
  }, [clubId]);

  function togglePlayer(name) {
    setRows(r => {
      const next = { ...r };
      if (next[name]) delete next[name];
      else next[name] = { ...BLANK };
      return next;
    });
  }

  function updateRow(name, k, v) {
    setRows(r => ({ ...r, [name]: { ...r[name], [k]: v } }));
  }

  async function apply() {
    if (!opponent.trim()) { setStatus('Opponent required.'); return; }
    setBusy(true);
    setStatus('');
    try {
      const playerList = Object.entries(rows).map(([name, v]) => ({ name, ...v }));
      const motm = playerList.find(p => p.motm)?.name || null;
      const resultDoc = await addDoc(collection(db, 'clubs', clubId, 'results'), {
        opponent: opponent.trim(),
        date: Timestamp.fromDate(new Date(date)),
        ourScore: Number(ourScore) || 0,
        theirScore: Number(theirScore) || 0,
        summary,
        players: playerList,
        motm,
        createdAt: Timestamp.now(),
      });

      for (const p of playerList) {
        const sref = doc(db, 'clubs', clubId, 'stats', p.name);
        const aref = doc(db, 'clubs', clubId, 'allTimeStats', p.name);
        const fref = doc(db, 'clubs', clubId, 'playerForm', p.name);
        const [ssnap, asnap, fsnap] = await Promise.all([getDoc(sref), getDoc(aref), getDoc(fref)]);
        const curS = ssnap.exists() ? ssnap.data() : {};
        const curA = asnap.exists() ? asnap.data() : {};
        const curF = fsnap.exists() ? fsnap.data() : { games: [] };

        const deltas = {
          apps: 1,
          goals: Number(p.goals) || 0,
          assists: Number(p.assists) || 0,
          yellows: Number(p.yellows) || 0,
          reds: Number(p.reds) || 0,
          cleanSheets: p.cleanSheet ? 1 : 0,
          motm: p.motm ? 1 : 0,
        };
        const merged = (base) => ({
          apps: (base.apps || 0) + deltas.apps,
          goals: (base.goals || 0) + deltas.goals,
          assists: (base.assists || 0) + deltas.assists,
          yellows: (base.yellows || 0) + deltas.yellows,
          reds: (base.reds || 0) + deltas.reds,
          cleanSheets: (base.cleanSheets || 0) + deltas.cleanSheets,
          motm: (base.motm || 0) + deltas.motm,
        });
        await setDoc(sref, merged(curS), { merge: true });
        await setDoc(aref, merged(curA), { merge: true });

        const nextForm = [...(curF.games || []), { rating: Number(p.rating), opp: opponent.trim(), date }].slice(-5);
        await setDoc(fref, { games: nextForm }, { merge: true });
      }

      setStatus('Report applied · stats updated · result saved.');
      setRows({});
      setSummary('');
    } catch (e) {
      setStatus('Failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return <Navigate to=".." replace />;

  const included = Object.keys(rows);

  return (
    <div className="stack-lg">
      <div>
        <div className="eyebrow">Matchday</div>
        <h1>Match Report</h1>
        <p className="muted">Log the result, ratings, and stats in one go. Archived to results and player records.</p>
      </div>

      <div className="card stack-sm">
        <div className="grid-3">
          <div className="field">
            <label className="label">Opponent</label>
            <input className="input" value={opponent} onChange={e => setOpponent(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Score ({club.name} – Opp)</label>
            <div className="row">
              <input className="input" type="number" min={0} value={ourScore} onChange={e => setOurScore(e.target.value)} />
              <input className="input" type="number" min={0} value={theirScore} onChange={e => setTheirScore(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="field">
          <label className="label">Summary</label>
          <textarea className="textarea" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief match summary…" />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Who played?</div>
          <div className="tiny muted">{included.length} selected</div>
        </div>
        <div className="grid-auto" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {players.map(p => {
            const sel = !!rows[p.name];
            return (
              <button key={p.id} type="button"
                className="card" style={{ padding: '.6rem', cursor: 'pointer', borderColor: sel ? 'var(--primary)' : 'var(--border)', background: sel ? 'var(--primary-dim)' : 'var(--bg-card)' }}
                onClick={() => togglePlayer(p.name)}>
                <div className="row">
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                  <strong>{p.name}</strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {included.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-title" style={{ marginBottom: '.6rem' }}>Per-player ratings &amp; stats</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Player</th><th className="num">Rating</th><th className="num">G</th><th className="num">A</th><th className="num">YC</th><th className="num">RC</th><th>CS</th><th>MOTM</th>
              </tr>
            </thead>
            <tbody>
              {included.map(name => {
                const r = rows[name];
                return (
                  <tr key={name}>
                    <td><strong>{name}</strong></td>
                    <td className="num"><input className="input stat-input" type="number" step="0.1" min={1} max={10} value={r.rating} onChange={e => updateRow(name, 'rating', e.target.value)} /></td>
                    <td className="num"><input className="input stat-input" type="number" min={0} value={r.goals} onChange={e => updateRow(name, 'goals', e.target.value)} /></td>
                    <td className="num"><input className="input stat-input" type="number" min={0} value={r.assists} onChange={e => updateRow(name, 'assists', e.target.value)} /></td>
                    <td className="num"><input className="input stat-input" type="number" min={0} value={r.yellows} onChange={e => updateRow(name, 'yellows', e.target.value)} /></td>
                    <td className="num"><input className="input stat-input" type="number" min={0} value={r.reds} onChange={e => updateRow(name, 'reds', e.target.value)} /></td>
                    <td><input type="checkbox" checked={r.cleanSheet} onChange={e => updateRow(name, 'cleanSheet', e.target.checked)} /></td>
                    <td><input type="checkbox" checked={r.motm} onChange={e => {
                      const val = e.target.checked;
                      setRows(rs => {
                        const next = {};
                        Object.keys(rs).forEach(k => { next[k] = { ...rs[k], motm: k === name ? val : false }; });
                        return next;
                      });
                    }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {status && <div className={status.startsWith('Failed') ? '' : 'pill'} style={{ color: status.startsWith('Failed') ? 'var(--loss)' : undefined }}>{status}</div>}

      <div className="row">
        <button className="btn" onClick={apply} disabled={busy || included.length === 0}>
          {busy ? 'Saving…' : 'Apply report + update stats'}
        </button>
      </div>
    </div>
  );
}
