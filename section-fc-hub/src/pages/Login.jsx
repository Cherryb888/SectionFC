import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/app';
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, pw);
      nav(next, { replace: true });
    } catch (e) {
      setErr(e.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow" style={{ paddingTop: '4rem' }}>
      <div className="eyebrow">Welcome back</div>
      <h1>Log in</h1>
      <form onSubmit={onSubmit} className="card stack-md">
        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label className="label">Password</label>
          <input className="input" type="password" required value={pw} onChange={e => setPw(e.target.value)} />
        </div>
        {err && <div style={{ color: 'var(--loss)' }}>{err}</div>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <div className="muted tiny" style={{ textAlign: 'center' }}>
          No club yet? <Link to="/signup">Create one</Link>.
        </div>
      </form>
    </div>
  );
}
