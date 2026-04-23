import React from 'react';
import { NavLink, Outlet, useParams, Link, useNavigate } from 'react-router-dom';
import { useClub } from '../../clubs/ClubProvider.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';

const PUBLIC_TABS = [
  { to: '', label: 'Home', end: true },
  { to: 'squad', label: 'Squad' },
  { to: 'fixtures', label: 'Fixtures' },
  { to: 'table', label: 'Table' },
  { to: 'stats', label: 'Stats' },
  { to: 'hall-of-fame', label: 'Hall of Fame' },
  { to: 'predictor', label: 'Predictor' },
  { to: 'combine', label: 'Combine' },
];

const ADMIN_TABS = [
  { to: 'matchday', label: 'Matchday' },
  { to: 'report', label: 'Report' },
  { to: 'settings', label: 'Settings' },
];

export default function ClubLayout() {
  const { club, isAdmin } = useClub();
  const { slug } = useParams();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  if (!club) return null;

  const tabs = [...PUBLIC_TABS, ...(isAdmin ? ADMIN_TABS : [])];

  async function onLogout() {
    await logout();
    nav('/');
  }

  return (
    <>
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link to={`/c/${slug}`} className="app-brand">
            {club.crestUrl
              ? <img src={club.crestUrl} alt="" className="app-brand-crest" />
              : <span className="app-brand-crest" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  {club.name?.[0] || 'C'}
                </span>
            }
            <span>{club.name}</span>
          </Link>
          <nav className="app-tabs">
            {tabs.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-nav-right">
            {user
              ? <>
                  <Link to="/app" className="btn btn-ghost btn-sm">My Clubs</Link>
                  <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign out</button>
                </>
              : <>
                  <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                  <Link to="/signup" className="btn btn-sm">Create club</Link>
                </>
            }
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="container muted tiny" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        Powered by <Link to="/">Sectioned Clubs</Link> · Your club, your hub.
      </footer>
    </>
  );
}
