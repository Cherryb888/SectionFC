import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

const STAT_COLS = [
  { k: 'apps', label: 'Apps' },
  { k: 'goals', label: 'G' },
  { k: 'assists', label: 'A' },
  { k: 'motm', label: 'MOTM' },
  { k: 'yellows', label: 'YC' },
  { k: 'reds', label: 'RC' },
  { k: 'cleanSheets', label: 'CS' },
];

function ratingClass(r) {
  if (r <= 4.5) return 'rating-r1';
  if (r <= 5.5) return 'rating-r2';
  if (r <= 6.5) return 'rating-r3';
  if (r <= 7.5) return 'rating-r4';
  if (r <= 8.5) return 'rating-r5';
  return 'rating-r6';
}

export default function Stats() {
  const { clubId, players, isAdmin } = useClub();
  const [tab, setTab] = useState('season');
  const [season, setSeason] = useState({});
  const [allTime, setAllTime] = useState({});
  const [form, setForm] = useState({});
  const [sortBy, setSortBy] = useState('goals');

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'clubs', clubId, 'stats'), s => {
        const out = {};
        s.forEach(d => { out[d.id] = d.data(); });
        setSeason(out);
      }),
      onSnapshot(collection(db, 'clubs', clubId, 'allTimeStats'), s => {
        const out = {};
        s.forEach(d => { out[d.id] = d.data(); });
        setAllTime(out);
      }),
      onSnapshot(collection(db, 'clubs', clubId, 'playerForm'), s => {
        const out = {};
        s.forEach(d => { out[d.id] = d.data(); });
        setForm(out);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [clubId]);

  const rows = useMemo(() => {
    const src = tab === 'season' ? season : allTime;
    return players
      .map(p => ({ name: p.name, photoUrl: p.photoUrl, ...(src[p.name] || {}) }))
      .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  }, [players, season, allTime, tab, sortBy]);

  async function updateStat(playerName, key, value) {
    const col = tab === 'season' ? 'stats' : 'allTimeStats';
    await setDoc(doc(db, 'clubs', clubId, col, playerName), { [key]: Number(value) || 0 }, { merge: true });
  }

  return (
    <div className="stack-lg">
      <div>
        <div className="eyebrow">Performance</div>
        <h1>Stats</h1>
      </div>
      <div className="row">
        <button className={`app-tab ${tab === 'season' ? 'active' : ''}`} onClick={() => setTab('season')}>Season</button>
        <button className={`app-tab ${tab === 'alltime' ? 'active' : ''}`} onClick={() => setTab('alltime')}>All-time</button>
        <button className={`app-tab ${tab === 'form' ? 'active' : ''}`} onClick={() => setTab('form')}>Form</button>
      </div>

      {tab !== 'form'
        ? <div className="card" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Player</th>
                  {STAT_COLS.map(c => (
                    <th key={c.k} className="num">
                      <button className="app-tab" style={{ padding:'.1rem .4rem' }} onClick={() => setSortBy(c.k)}>
                        {c.label}{sortBy === c.k ? ' ↓' : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name}>
                    <td>
                      <div className="row" style={{ gap: '.5rem' }}>
                        <PlayerAvatar name={r.name} photoUrl={r.photoUrl} size="sm" />
                        <strong>{r.name}</strong>
                      </div>
                    </td>
                    {STAT_COLS.map(c => (
                      <td key={c.k} className="num">
                        {isAdmin
                          ? <EditableCell value={r[c.k] || 0} onSave={v => updateStat(r.name, c.k, v)} />
                          : (r[c.k] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        : <div className="grid-auto">
            {players.map(p => {
              const games = (form[p.name]?.games || []).slice(-5);
              const avg = games.length ? (games.reduce((s, g) => s + Number(g.rating || 0), 0) / games.length) : null;
              return (
                <div key={p.name} className="card">
                  <div className="row" style={{ gap: '.7rem' }}>
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div className="tiny muted">Last {games.length || 0} games</div>
                    </div>
                    {avg != null && <span className={`rating ${ratingClass(avg)}`}>{avg.toFixed(1)}</span>}
                  </div>
                  {games.length > 0 && (
                    <div className="row" style={{ marginTop: '.6rem', flexWrap: 'wrap', gap: '.3rem' }}>
                      {games.map((g, i) => (
                        <span key={i} className={`rating ${ratingClass(Number(g.rating || 0))}`} title={`vs ${g.opp || '?'}`}>
                          {Number(g.rating).toFixed(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

function EditableCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (!editing) {
    return <span className="stat-cell" onClick={() => setEditing(true)}>{value}</span>;
  }
  return (
    <input
      className="input stat-input"
      autoFocus
      type="number"
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={async () => { await onSave(v); setEditing(false); }}
      onKeyDown={async e => { if (e.key === 'Enter') { await onSave(v); setEditing(false); } }}
    />
  );
}
