import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useClub } from '../../clubs/ClubProvider.jsx';
import PlayerAvatar from '../../components/PlayerAvatar.jsx';

function resultSymbol(ours, theirs) {
  if (ours == null || theirs == null) return 'D';
  if (ours > theirs) return 'W';
  if (ours < theirs) return 'L';
  return 'D';
}

function formatDate(d) {
  if (!d) return '';
  const dt = d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function Home() {
  const { club, clubId, players } = useClub();
  const [nextFixture, setNextFixture] = useState(null);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    if (!clubId) return;
    const qf = query(collection(db, 'clubs', clubId, 'fixtures'), orderBy('date'), limit(20));
    const unsubF = onSnapshot(qf, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const now = Date.now();
      const upcoming = all.find(f => {
        const dt = f.date?.toDate ? f.date.toDate().getTime() : new Date(f.date).getTime();
        return dt >= now - 86400000;
      });
      setNextFixture(upcoming || null);
    });
    const qr = query(collection(db, 'clubs', clubId, 'results'), orderBy('date', 'desc'), limit(5));
    const unsubR = onSnapshot(qr, snap => {
      setRecentResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubF(); unsubR(); };
  }, [clubId]);

  return (
    <div className="stack-lg">
      <section style={{ padding: '1.5rem 0' }}>
        <div className="eyebrow">Welcome to</div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>{club.name}</h1>
        {club.tagline && <p className="muted" style={{ fontSize: '1.15rem', marginTop: '-.3rem' }}>{club.tagline}</p>}
        {club.league && <div className="pill">{club.league}</div>}
      </section>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Next Match</div>
            {nextFixture && <div className="pill">{formatDate(nextFixture.date)}</div>}
          </div>
          {nextFixture
            ? <div>
                <div className="row" style={{ justifyContent: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="avatar avatar-lg" style={{ margin: '0 auto' }}>
                      {club.crestUrl ? <img src={club.crestUrl} alt="" /> : (club.name[0] || 'C').toUpperCase()}
                    </div>
                    <div style={{ marginTop:'.4rem', fontWeight:700 }}>{club.name}</div>
                    <div className="tiny muted">{nextFixture.home ? 'Home' : 'Away'}</div>
                  </div>
                  <div className="score-big muted">vs</div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="avatar avatar-lg" style={{ margin: '0 auto', background: 'var(--bg-raised)' }}>
                      {(nextFixture.opponent?.[0] || '?').toUpperCase()}
                    </div>
                    <div style={{ marginTop:'.4rem', fontWeight:700 }}>{nextFixture.opponent}</div>
                    {nextFixture.venue && <div className="tiny muted">{nextFixture.venue}</div>}
                  </div>
                </div>
                {nextFixture.time && <div className="muted" style={{ textAlign:'center', marginTop: '.6rem' }}>Kick-off {nextFixture.time}</div>}
                <div style={{ marginTop: '.8rem', textAlign:'center' }}>
                  <Link to="predictor" className="btn btn-sm">Open Predictor</Link>
                </div>
              </div>
            : <div className="empty" style={{ padding:'1.5rem 1rem' }}>
                No fixtures yet. <Link to="fixtures">Add one</Link>.
              </div>
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Recent Form</div>
            <Link to="fixtures" className="tiny muted">All results →</Link>
          </div>
          {recentResults.length === 0
            ? <div className="empty" style={{ padding:'1.5rem 1rem' }}>No results yet.</div>
            : <div className="stack-sm">
                {recentResults.map(r => {
                  const sym = resultSymbol(r.ourScore, r.theirScore);
                  return (
                    <div key={r.id} className="row-between" style={{ padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="row">
                        <span className={`form-dot ${sym}`} />
                        <span style={{ fontWeight:700 }}>{r.opponent}</span>
                      </div>
                      <div className="score-pill">
                        <span style={{ color: sym === 'W' ? 'var(--win)' : sym === 'L' ? 'var(--loss)' : 'var(--draw)' }}>
                          {r.ourScore}-{r.theirScore}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Squad ({players.length})</div>
          <Link to="squad" className="tiny muted">Manage →</Link>
        </div>
        {players.length === 0
          ? <div className="empty" style={{ padding:'1.5rem 1rem' }}>
              No players yet. <Link to="squad">Add your first player</Link>.
            </div>
          : <div className="grid-auto" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))' }}>
              {players.map(p => (
                <div key={p.id} style={{ textAlign:'center' }}>
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="lg" />
                  <div style={{ fontWeight:700, marginTop:'.4rem' }}>{p.name}</div>
                  <div className="tiny muted">{p.position || ''} {p.number ? `#${p.number}` : ''}</div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}
