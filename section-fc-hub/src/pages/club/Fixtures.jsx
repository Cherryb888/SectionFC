import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, orderBy, query, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';

function toDateInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Fixtures() {
  const { clubId, isAdmin } = useClub();
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const q1 = query(collection(db, 'clubs', clubId, 'fixtures'), orderBy('date'));
    const q2 = query(collection(db, 'clubs', clubId, 'results'), orderBy('date', 'desc'));
    const u1 = onSnapshot(q1, s => setFixtures(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(q2, s => setResults(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [clubId]);

  const now = Date.now();
  const upcoming = fixtures.filter(f => {
    const d = f.date?.toDate ? f.date.toDate().getTime() : new Date(f.date).getTime();
    return d >= now - 86400000;
  });

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <div className="eyebrow">Calendar</div>
          <h1>Fixtures &amp; Results</h1>
        </div>
        {isAdmin && <button className="btn" onClick={() => setAdding(true)}>+ Add fixture</button>}
      </div>

      {adding && <FixtureForm clubId={clubId} onDone={() => setAdding(false)} />}

      <div className="card">
        <div className="card-title" style={{ marginBottom: '.6rem' }}>Upcoming</div>
        {upcoming.length === 0
          ? <div className="muted">No upcoming fixtures.</div>
          : <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Opponent</th><th>Venue</th><th>Time</th>{isAdmin && <th></th>}</tr>
              </thead>
              <tbody>
                {upcoming.map(f => (
                  <tr key={f.id}>
                    <td>{formatDate(f.date)}</td>
                    <td><strong>{f.opponent}</strong> <span className="tiny muted">({f.home ? 'H' : 'A'})</span></td>
                    <td className="muted">{f.venue || '—'}</td>
                    <td className="muted">{f.time || '—'}</td>
                    {isAdmin && <td className="num">
                      <button className="btn btn-ghost btn-sm" onClick={async () => {
                        if (confirm('Delete fixture?')) await deleteDoc(doc(db, 'clubs', clubId, 'fixtures', f.id));
                      }}>Delete</button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '.6rem' }}>Results</div>
        {results.length === 0
          ? <div className="muted">No results logged yet. Log one from the Report tab after a match.</div>
          : <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Opponent</th><th className="num">Score</th><th></th></tr>
              </thead>
              <tbody>
                {results.map(r => {
                  const w = r.ourScore > r.theirScore ? 'W' : r.ourScore < r.theirScore ? 'L' : 'D';
                  return (
                    <tr key={r.id}>
                      <td>{formatDate(r.date)}</td>
                      <td><strong>{r.opponent}</strong></td>
                      <td className="num">
                        <span style={{ color: w === 'W' ? 'var(--win)' : w === 'L' ? 'var(--loss)' : 'var(--draw)', fontWeight: 700 }}>
                          {r.ourScore}-{r.theirScore}
                        </span>
                      </td>
                      <td><span className={`form-dot ${w}`} /> {w === 'W' ? 'Win' : w === 'L' ? 'Loss' : 'Draw'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}

function FixtureForm({ clubId, onDone }) {
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [home, setHome] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!opponent.trim() || !date) return;
    setBusy(true);
    await addDoc(collection(db, 'clubs', clubId, 'fixtures'), {
      opponent: opponent.trim(),
      date: Timestamp.fromDate(new Date(date)),
      time,
      venue,
      home,
      createdAt: Timestamp.now(),
    });
    setBusy(false);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="card stack-sm">
      <div className="card-title">Add fixture</div>
      <div className="grid-2">
        <div className="field">
          <label className="label">Opponent</label>
          <input className="input" required value={opponent} onChange={e => setOpponent(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label className="label">Date</label>
          <input className="input" type="date" required value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Time</label>
          <input className="input" value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 19:30" />
        </div>
        <div className="field">
          <label className="label">Venue</label>
          <input className="input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Powerleague Shoreditch" />
        </div>
      </div>
      <div className="field">
        <label className="label">Home / Away</label>
        <div className="row">
          <label className="row" style={{ gap: '.3rem' }}><input type="radio" checked={home} onChange={() => setHome(true)} /> Home</label>
          <label className="row" style={{ gap: '.3rem' }}><input type="radio" checked={!home} onChange={() => setHome(false)} /> Away</label>
        </div>
      </div>
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save fixture'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
