import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { user, loading, configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) return <div className="page-center">Loading…</div>;
  if (user) return null;

  if (!configured) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand-big">
            <span className="brand-mark">S</span> SprintFlow
          </div>
          <h1>Agile Sprint &amp; Task Management</h1>
          <p className="muted">
            Plan sprints, track user stories and tasks, and report on progress — all in one
            dashboard.
          </p>
          <div className="setup-note">
            <h3>Database not connected yet</h3>
            <p>
              SprintFlow stores data in a real <strong>PostgreSQL</strong> database. Once the
              database is connected, sign-up and sign-in will appear here.
            </p>
            <p className="muted small">
              You can still explore the interface — data will be in-memory only until then.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw new Error(err.message);
        if (data.session) {
          // signed in immediately
        } else {
          setNotice('Account created! Check your email to confirm your address, then sign in.');
          setMode('signin');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw new Error(err.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-big">
          <span className="brand-mark">S</span> SprintFlow
        </div>
        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {mode === 'signup'
            ? 'Start planning your sprints in under a minute.'
            : 'Sign in to continue planning your sprints.'}
        </p>

        {notice && <div className="banner banner-info">{notice}</div>}
        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@team.com"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <a onClick={() => { setMode('signin'); setError(null); }}>Sign in</a>
            </>
          ) : (
            <>
              New to SprintFlow?{' '}
              <a onClick={() => { setMode('signup'); setError(null); }}>Create an account</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}