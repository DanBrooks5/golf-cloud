'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import Link from 'next/link';

const supabase = supabaseBrowser();

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to uploads
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) window.location.href = '/uploads';
    });
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) setError(error.message);
    else window.location.href = '/uploads';
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password: pwd });
    setBusy(false);
    if (error) setError(error.message);
    else window.location.href = '/uploads';
  }

  return (
    <main className="auth-wrap">
      <section className="card auth-card">
        <h1 className="title">Welcome to Golf Cloud</h1>
        <p className="muted">Back up your swings, rate them, and share with your coach.</p>

        <form className="vstack" onSubmit={handleSignIn}>
          <label className="label">Email</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label className="label" style={{ marginTop: 12 }}>Password</label>
          <input
            type="password"
            required
            className="input"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
          />

          {error ? <div className="error">{error}</div> : null}

          <div className="hstack" style={{ gap: 12, marginTop: 16 }}>
            <button className="btn" disabled={busy} onClick={handleSignIn}>
              {busy ? 'Working…' : 'Sign in'}
            </button>
            <button type="button" className="btn ghost" disabled={busy} onClick={handleSignUp}>
              Create account
            </button>
          </div>
        </form>

        <div style={{ marginTop: 20 }}>
          <Link className="link" href="/">← Back to home</Link>
        </div>
      </section>
    </main>
  );
}
