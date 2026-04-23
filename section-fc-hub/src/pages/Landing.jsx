import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

const FEATURES = [
  { icon: '⚽', title: 'Matchday Hub', body: 'Publish your starting lineup, bench, and opponent preview. Auto-generated pitch visual.' },
  { icon: '📊', title: 'Stats That Matter', body: 'Season and all-time stats per player, plus a 5-game form tracker with rating color scale.' },
  { icon: '🏆', title: 'Hall of Fame', body: 'Customisable team awards — Golden Boot, Assist King, Mr. Reliable, or your own.' },
  { icon: '🎯', title: 'Match Predictor', body: 'Squad submits score predictions and prop bets each week. Season leaderboard keeps things spicy.' },
  { icon: '📝', title: 'Match Reports', body: 'Post-match player ratings, goals, assists, cards, MOTM — with auto-stat sync and archive.' },
  { icon: '🧠', title: 'Skills Combine', body: 'Five mini-games to rank your squad by accuracy, reaction, speed, memory, and decision making.' },
  { icon: '📅', title: 'Fixtures & Table', body: 'Club-managed fixtures and league standings. Shareable public page for the faithful.' },
  { icon: '🎨', title: 'Your Club Brand', body: 'Custom colors, crest, and tagline. Every club gets its own branded hub on a shareable URL.' },
];

const FAQ = [
  {
    q: 'Is this for 5-a-side or 11-a-side?',
    a: 'Both. You set the squad size when you create your club — works for small-sided, Sunday league, and full 11-a-side teams.',
  },
  {
    q: 'Who can see my club page?',
    a: 'Your club home, fixtures, table, stats, and hall of fame are publicly viewable at a sharable URL. Only admins can edit data.',
  },
  {
    q: 'Do my players need accounts?',
    a: 'No. Players are just names on your roster. Only club admins need an account. Players predict and play the combine without signing up.',
  },
  {
    q: 'Can multiple clubs use it at once?',
    a: 'Yes — that is the whole idea. Each club is isolated with its own data, players, colors, and URL.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link to="/" className="app-brand">
            <span className="app-brand-crest" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--primary)', fontSize:'1.1rem' }}>◢</span>
            Sectioned Clubs
          </Link>
          <div className="app-nav-right" style={{ marginLeft: 'auto' }}>
            {user
              ? <Link to="/app" className="btn btn-sm">My Clubs</Link>
              : <>
                  <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                  <Link to="/signup" className="btn btn-sm">Start free</Link>
                </>
            }
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="eyebrow">The club hub for grassroots football</div>
          <h1>Run your team like <span className="accent">the big clubs do</span>.</h1>
          <p className="hero-sub">
            Matchday lineups, league tables, player stats, weekly predictors, and post-match reports — all in one branded hub for your 5-a-side, Sunday-league, or 11-a-side team.
          </p>
          <div className="hero-ctas">
            <Link to="/signup" className="btn">Create your club</Link>
            <Link to="/login" className="btn btn-ghost">I already have one</Link>
          </div>
          <div className="grid-3" style={{ maxWidth: 720, margin: '2.5rem auto 0' }}>
            <div className="stat-block"><div className="n">5v5</div><div className="l">or 11v11</div></div>
            <div className="stat-block"><div className="n">∞</div><div className="l">players &amp; matches</div></div>
            <div className="stat-block"><div className="n">1</div><div className="l">branded club URL</div></div>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="eyebrow" style={{ textAlign: 'center' }}>What&apos;s inside</div>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1.5rem' }}>Everything your club actually uses</h2>
        <div className="grid-auto">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: '1.8rem', marginBottom: '.4rem' }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container">
        <div className="card" style={{ padding: '2rem', display:'grid', gridTemplateColumns:'1fr', gap:'1.2rem' }}>
          <div className="eyebrow">How it works</div>
          <div className="grid-3">
            <div>
              <div className="pill">1 · Create</div>
              <h3 style={{ marginTop:'.6rem' }}>Set up your club</h3>
              <p className="muted">Pick your name, colors, crest, and squad size. Takes a minute.</p>
            </div>
            <div>
              <div className="pill">2 · Populate</div>
              <h3 style={{ marginTop:'.6rem' }}>Add players &amp; fixtures</h3>
              <p className="muted">Roster with photos (optional), league table, and upcoming games.</p>
            </div>
            <div>
              <div className="pill">3 · Run</div>
              <h3 style={{ marginTop:'.6rem' }}>Play the season</h3>
              <p className="muted">Publish matchday squad, log results, watch stats and form grow.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="eyebrow" style={{ textAlign: 'center' }}>Questions</div>
        <h2 style={{ textAlign: 'center', fontSize: '2rem' }}>Frequently asked</h2>
        <div className="stack-md" style={{ maxWidth: 720, margin: '0 auto' }}>
          {FAQ.map(f => (
            <div key={f.q} className="card">
              <h3 style={{ fontSize: '1rem' }}>{f.q}</h3>
              <p className="muted" style={{ margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2 style={{ fontSize: '2.2rem' }}>Ready to kick off?</h2>
        <p className="muted" style={{ maxWidth: 520, margin: '0 auto 1.4rem' }}>
          Free to set up. Bring your squad and your fixtures, we&apos;ll handle the rest.
        </p>
        <Link to="/signup" className="btn">Create your club</Link>
      </section>

      <footer className="container muted tiny" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        © {new Date().getFullYear()} Sectioned Clubs. Built for the grassroots.
      </footer>
    </div>
  );
}
