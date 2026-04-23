import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { listClubsForUser } from '../clubs/clubService.js';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setClubs(await listClubsForUser(user.uid));
      setLoading(false);
    })();
  }, [user]);

  async function onLogout() {
    await logout();
    nav('/');
  }

  return (
    <>
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link to="/" className="app-brand">
            <span className="app-brand-crest" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--primary)' }}>◢</span>
            Sectioned Clubs
          </Link>
          <div className="app-nav-right" style={{ marginLeft: 'auto' }}>
            <span className="muted tiny">{user?.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </header>
      <div className="container">
        <div className="row-between" style={{ marginBottom: '1.2rem' }}>
          <div>
            <div className="eyebrow">Your clubs</div>
            <h1>Choose a club</h1>
          </div>
          <Link to="/new" className="btn">+ New club</Link>
        </div>

        {loading
          ? <div className="center-screen">Loading…</div>
          : clubs.length === 0
            ? <div className="empty">
                <h3>You don&apos;t have a club yet</h3>
                <p>Create your first club and start tracking your season.</p>
                <Link to="/new" className="btn" style={{ marginTop: '.8rem' }}>Create your first club</Link>
              </div>
            : <div className="grid-auto">
                {clubs.map(c => (
                  <Link key={c.id} to={`/c/${c.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="row" style={{ gap: '.8rem' }}>
                      <span className="avatar avatar-lg" style={{ background: c.colors?.primary + '22', color: c.colors?.primary }}>
                        {c.crestUrl
                          ? <img src={c.crestUrl} alt="" />
                          : (c.name?.[0] || 'C').toUpperCase()}
                      </span>
                      <div>
                        <h3 style={{ margin: 0 }}>{c.name}</h3>
                        <div className="muted tiny">{c.league || 'No league set'}</div>
                        <div className="tiny pill" style={{ marginTop: '.4rem' }}>{c.squadSize || 5}-a-side</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
        }
      </div>
    </>
  );
}
