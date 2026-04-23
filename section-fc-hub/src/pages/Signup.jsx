import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    if (pw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      await signup(email, pw, name);
      nav('/new', { replace: true });
    } catch (e) {
      setErr(e.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow" style={{ paddingTop: '4rem' }}>
      <div className="eyebrow">Start free</div>
      <h1>Create an account</h1>
      <p className="muted">You&apos;ll set up your club right after.</p>
      <form onSubmit={onSubmit} className="card stack-md">
        <div className="field">
          <label className="label">Your name</label>
          <input className="input" required value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Password</label>
          <input className="input" type="password" required value={pw} onChange={e => setPw(e.target.value)} minLength={6} />
        </div>
        {err && <div style={{ color: 'var(--loss)' }}>{err}</div>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <div className="muted tiny" style={{ textAlign: 'center' }}>
          Already have one? <Link to="/login">Log in</Link>.
        </div>
      </form>
    </div>
  );
}
