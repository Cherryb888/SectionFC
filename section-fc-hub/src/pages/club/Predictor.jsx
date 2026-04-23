import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

function scorePredict(predH, predA, actH, actA) {
  if (predH === actH && predA === actA) return 3;
  const pd = predH - predA, ad = actH - actA;
  if ((pd > 0 && ad > 0) || (pd < 0 && ad < 0) || (pd === 0 && ad === 0)) return 1;
  return 0;
}

export default function Predictor() {
  const { club, clubId, players, isAdmin } = useClub();
  const [pred, setPred] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'clubs', clubId, 'predictor', 'current'), s => setPred(s.exists() ? s.data() : null));
    const u2 = onSnapshot(doc(db, 'clubs', clubId, 'predictor', 'leaderboard'), s => setLeaderboard(s.exists() ? (s.data().entries || []) : []));
    return () => { u1(); u2(); };
  }, [clubId]);

  return (
    <div className="stack-lg">
      <div>
        <div className="eyebrow">Weekly game</div>
        <h1>Match Predictor</h1>
        <p className="muted">Everyone picks a scoreline + MOTM. 3pts for exact, 1pt for result, bonus for MOTM.</p>
      </div>

      {!pred || !pred.active
        ? isAdmin
          ? <SetupPanel clubId={clubId} club={club} />
          : <div className="empty"><h3>No active predictor</h3><p>Admin hasn&apos;t set up this week&apos;s match yet.</p></div>
        : pred.result
          ? <ResultsPanel pred={pred} clubId={clubId} players={players} isAdmin={isAdmin} />
          : <ActivePanel pred={pred} clubId={clubId} players={players} isAdmin={isAdmin} club={club} />
      }

      {leaderboard.length > 0 && (
        <div className="card">
          <div className="card-title">Season Leaderboard</div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Player</th><th className="num">Games</th><th className="num">Points</th></tr></thead>
            <tbody>
              {[...leaderboard].sort((a,b) => b.pts - a.pts).map((e, i) => (
                <tr key={e.player}>
                  <td className="muted">{i + 1}</td>
                  <td><strong>{e.player}</strong></td>
                  <td className="num">{e.games || 0}</td>
                  <td className="num" style={{ fontWeight:700 }}>{e.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SetupPanel({ clubId, club }) {
  const [opp, setOpp] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function start() {
    if (!opp.trim()) return;
    await setDoc(doc(db, 'clubs', clubId, 'predictor', 'current'), {
      active: true,
      opp: opp.trim(),
      date,
      home: club.name,
      away: opp.trim(),
      predictions: [],
      result: null,
      createdAt: Timestamp.now(),
    });
  }

  return (
    <div className="card stack-sm">
      <div className="card-title">Start a predictor round</div>
      <div className="grid-2">
        <div className="field">
          <label className="label">Opponent</label>
          <input className="input" value={opp} onChange={e => setOpp(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div><button className="btn" onClick={start}>Open predictor</button></div>
    </div>
  );
}

function ActivePanel({ pred, clubId, players, isAdmin, club }) {
  const [name, setName] = useState('');
  const [h, setH] = useState(2);
  const [a, setA] = useState(1);
  const [motm, setMotm] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!name) return;
    await updateDoc(doc(db, 'clubs', clubId, 'predictor', 'current'), {
      predictions: arrayUnion({ player: name, home: Number(h), away: Number(a), motm, submittedAt: Timestamp.now() }),
    });
    setSubmitted(true);
  }

  const [rh, setRh] = useState(0);
  const [ra, setRa] = useState(0);
  const [rm, setRm] = useState('');

  async function reveal() {
    const result = { home: Number(rh), away: Number(ra), motm: rm };
    await updateDoc(doc(db, 'clubs', clubId, 'predictor', 'current'), { result, active: false });

    const ref = doc(db, 'clubs', clubId, 'predictor', 'leaderboard');
    const snap = await getDoc(ref);
    const entries = snap.exists() ? (snap.data().entries || []) : [];
    const map = new Map(entries.map(e => [e.player, { ...e }]));
    for (const p of pred.predictions || []) {
      const pts = scorePredict(p.home, p.away, result.home, result.away) + (p.motm && p.motm === result.motm ? 1 : 0);
      const cur = map.get(p.player) || { player: p.player, pts: 0, games: 0 };
      cur.pts = (cur.pts || 0) + pts;
      cur.games = (cur.games || 0) + 1;
      map.set(p.player, cur);
    }
    await setDoc(ref, { entries: Array.from(map.values()) }, { merge: true });
  }

  return (
    <div className="stack-md">
      <div className="card">
        <div className="card-title">{club.name} vs {pred.opp}</div>
        <div className="muted tiny">{pred.date}</div>
        {submitted
          ? <div className="pill" style={{ marginTop: '.8rem' }}>Prediction submitted ✓</div>
          : <div className="stack-sm" style={{ marginTop: '.8rem' }}>
              <div className="field">
                <label className="label">Your name</label>
                <select className="select" value={name} onChange={e => setName(e.target.value)}>
                  <option value="">— choose —</option>
                  {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid-3">
                <div className="field"><label className="label">{club.name}</label>
                  <input className="input" type="number" min={0} value={h} onChange={e => setH(e.target.value)} /></div>
                <div className="field"><label className="label">{pred.opp}</label>
                  <input className="input" type="number" min={0} value={a} onChange={e => setA(e.target.value)} /></div>
                <div className="field"><label className="label">MOTM pick</label>
                  <select className="select" value={motm} onChange={e => setMotm(e.target.value)}>
                    <option value="">—</option>
                    {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div><button className="btn" onClick={submit} disabled={!name}>Submit prediction</button></div>
            </div>
        }
      </div>

      {isAdmin && (
        <div className="card">
          <div className="card-title">Reveal result (admin)</div>
          <div className="grid-3" style={{ marginTop: '.6rem' }}>
            <div className="field"><label className="label">{club.name}</label>
              <input className="input" type="number" min={0} value={rh} onChange={e => setRh(e.target.value)} /></div>
            <div className="field"><label className="label">{pred.opp}</label>
              <input className="input" type="number" min={0} value={ra} onChange={e => setRa(e.target.value)} /></div>
            <div className="field"><label className="label">MOTM</label>
              <select className="select" value={rm} onChange={e => setRm(e.target.value)}>
                <option value="">—</option>
                {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" onClick={reveal}>Reveal &amp; score</button>
        </div>
      )}

      <div className="card">
        <div className="card-title">Submissions ({(pred.predictions || []).length})</div>
        <div className="grid-auto" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', marginTop:'.6rem' }}>
          {(pred.predictions || []).map((p, i) => (
            <div key={i} className="card" style={{ padding: '.6rem' }}>
              <div className="row-between">
                <strong>{p.player}</strong>
                <span className="score-pill">{p.home}-{p.away}</span>
              </div>
              {p.motm && <div className="tiny muted">MOTM: {p.motm}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ pred, clubId, players, isAdmin }) {
  const preds = pred.predictions || [];
  return (
    <div className="stack-md">
      <div className="card">
        <div className="card-title">Final result</div>
        <div className="score-big" style={{ textAlign: 'center', padding: '1rem 0' }}>
          {pred.home} {pred.result.home} – {pred.result.away} {pred.away}
        </div>
        {pred.result.motm && <div style={{ textAlign:'center' }} className="pill">MOTM: {pred.result.motm}</div>}
      </div>

      <div className="card">
        <div className="card-title">This round&apos;s points</div>
        <table className="tbl">
          <thead><tr><th>Player</th><th>Prediction</th><th>MOTM</th><th className="num">Pts</th></tr></thead>
          <tbody>
            {preds.map((p, i) => {
              const base = scorePredict(p.home, p.away, pred.result.home, pred.result.away);
              const bonus = p.motm && p.motm === pred.result.motm ? 1 : 0;
              return (
                <tr key={i}>
                  <td><strong>{p.player}</strong></td>
                  <td>{p.home}-{p.away}</td>
                  <td className="tiny muted">{p.motm || '—'}</td>
                  <td className="num" style={{ fontWeight:700, color:'var(--primary)' }}>{base + bonus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div>
          <button className="btn btn-ghost" onClick={() => setDoc(doc(db, 'clubs', clubId, 'predictor', 'current'), { active: false, result: null, predictions: [] }, { merge: true })}>
            Clear round
          </button>
        </div>
      )}
    </div>
  );
}
