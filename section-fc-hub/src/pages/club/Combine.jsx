import React, { useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import TargetShooter from '../../metrics/games/TargetShooter.jsx';
import KeeperDive from '../../metrics/games/KeeperDive.jsx';
import SprintMeter from '../../metrics/games/SprintMeter.jsx';
import TacticsRecall from '../../metrics/games/TacticsRecall.jsx';
import PassOrShoot from '../../metrics/games/PassOrShoot.jsx';
import {
  scoreAccuracy, scoreReaction, scoreSpeed, scoreMemory, scoreDecision,
  computeOVR, tierOf,
} from '../../metrics/scoring.js';
import { METRICS_CSS } from '../../metrics/shared.jsx';

const GAMES = [
  { key: 'accuracy', title: 'Target Shooter',  subtitle: 'Accuracy',        Component: TargetShooter, scoreFn: scoreAccuracy },
  { key: 'reaction', title: 'Keeper Dive',     subtitle: 'Reaction',        Component: KeeperDive,    scoreFn: scoreReaction },
  { key: 'speed',    title: 'Sprint Meter',    subtitle: 'Speed',           Component: SprintMeter,   scoreFn: scoreSpeed    },
  { key: 'memory',   title: 'Tactics Recall',  subtitle: 'Memory',          Component: TacticsRecall, scoreFn: scoreMemory   },
  { key: 'decision', title: 'Pass or Shoot',   subtitle: 'Decision-making', Component: PassOrShoot,   scoreFn: scoreDecision },
];

export default function Combine() {
  const { clubId, players } = useClub();
  const [phase, setPhase] = useState('intro'); // intro | playing | done
  const [name, setName] = useState('');
  const [stage, setStage] = useState(0);
  const [scores, setScores] = useState({});
  const [raw, setRaw] = useState({});
  const [startedAt, setStartedAt] = useState(0);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'clubs', clubId, 'combineRuns'), orderBy('ovr', 'desc'), limit(25));
    const unsub = onSnapshot(q, s => setRuns(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [clubId]);

  function start() {
    if (!name) return;
    setScores({});
    setRaw({});
    setStage(0);
    setStartedAt(Date.now());
    setPhase('playing');
  }

  async function onComplete(rawScoreForGame) {
    const g = GAMES[stage];
    const score = g.scoreFn(rawScoreForGame);
    const newScores = { ...scores, [g.key]: score };
    const newRaw = { ...raw, [g.key]: rawScoreForGame };
    setScores(newScores);
    setRaw(newRaw);
    if (stage < GAMES.length - 1) {
      setStage(stage + 1);
    } else {
      const ovr = computeOVR(newScores);
      const tier = tierOf(ovr);
      await addDoc(collection(db, 'clubs', clubId, 'combineRuns'), {
        name,
        scores: newScores,
        raw: newRaw,
        ovr,
        tierLabel: tier.label,
        tierColor: tier.colour,
        durationMs: Date.now() - startedAt,
        createdAt: serverTimestamp(),
      });
      setPhase('done');
    }
  }

  if (phase === 'intro') {
    return (
      <div className="stack-lg">
        <div>
          <div className="eyebrow">Training ground</div>
          <h1>Combine</h1>
          <p className="muted">Five mini-games. Accuracy, reaction, speed, memory, decision-making. Your Overall rating is the weighted average.</p>
        </div>

        <div className="card stack-sm">
          <div className="card-title">Pick who&apos;s playing</div>
          {players.length === 0
            ? <div className="muted">No players yet. Add some in Squad.</div>
            : <select className="select" value={name} onChange={e => setName(e.target.value)}>
                <option value="">— choose —</option>
                {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
          }
          <button className="btn" onClick={start} disabled={!name}>Start combine</button>
        </div>

        <div className="grid-auto">
          {GAMES.map((g, i) => (
            <div key={g.key} className="feature-card">
              <div className="eyebrow">Station {i + 1}</div>
              <h3>{g.title}</h3>
              <div className="muted tiny">{g.subtitle}</div>
            </div>
          ))}
        </div>

        {runs.length > 0 && <Leaderboard runs={runs} />}
      </div>
    );
  }

  if (phase === 'playing') {
    const G = GAMES[stage];
    return (
      <div className="stack-md">
        <style>{METRICS_CSS}</style>
        <div className="row-between">
          <div>
            <div className="eyebrow">Station {stage + 1} of {GAMES.length}</div>
            <h2 style={{ margin: 0 }}>{G.title}</h2>
          </div>
          <div className="pill">{name}</div>
        </div>
        <div className="card" style={{ padding: '1rem', minHeight: 380, position: 'relative' }}>
          <G.Component onComplete={onComplete} />
        </div>
      </div>
    );
  }

  const ovr = computeOVR(scores);
  return (
    <div className="stack-lg">
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div className="eyebrow">Final score</div>
        <div className="score-big" style={{ color: 'var(--primary)' }}>{ovr}</div>
        <div className="pill" style={{ margin: '.4rem auto' }}>{tierOf(ovr).label} · {name}</div>
        <div className="grid-3" style={{ marginTop: '1.2rem' }}>
          {GAMES.map(g => (
            <div key={g.key} className="stat-block">
              <div className="n" style={{ fontSize: '1.8rem' }}>{scores[g.key]}</div>
              <div className="l">{g.subtitle}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn" onClick={() => setPhase('intro')}>Play again</button>
        </div>
      </div>
      <Leaderboard runs={runs} />
    </div>
  );
}

function Leaderboard({ runs }) {
  return (
    <div className="card">
      <div className="card-title">Leaderboard</div>
      <table className="tbl">
        <thead><tr><th>#</th><th>Player</th><th className="num">OVR</th><th className="num">Tier</th></tr></thead>
        <tbody>
          {runs.slice(0, 15).map((r, i) => (
            <tr key={r.id}>
              <td className="muted">{i + 1}</td>
              <td><strong>{r.name}</strong></td>
              <td className="num" style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.ovr}</td>
              <td className="num"><span className="pill">{r.tierLabel}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
