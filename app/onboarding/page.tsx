'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';

const supabase = supabaseBrowser();

export default function OnboardingPage() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<'player' | 'coach'>('player');
  const [coachEmail, setCoachEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription.unsubscribe();
  }, []);

  if (checking) return <div className="card"><p>Checking session…</p></div>;
  if (!session?.user) {
    return (
      <div className="card">
        <p>You are not signed in.</p>
        <Link className="btn" href="/signin">Go to sign in</Link>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const user = session.user;

      // 1) Set my role on profiles
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);
      if (upErr) throw upErr;

      // 2) If I'm a player and provided a coach email, create a share row
      const email = coachEmail.trim();
      if (role === 'player' && email) {
        const { error: shareErr } = await supabase
          .from('coach_access')
          .insert({ player_id: user.id, coach_email: email });
        if (shareErr) throw shareErr;
      }

      window.location.href = role === 'coach' ? '/coach' : '/uploads';
    } catch (e: any) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Set up your account</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className={`btn ${role === 'player' ? '' : 'ghost'}`} onClick={() => setRole('player')}>I’m a Player</button>
        <button className={`btn ${role === 'coach' ? '' : 'ghost'}`} onClick={() => setRole('coach')}>I’m a Coach</button>
      </div>

      {role === 'player' && (
        <div style={{ marginTop: 8 }}>
          <label className="small" htmlFor="coachEmail">Your coach’s email (optional)</label>
          <input
            id="coachEmail"
            className="input"
            placeholder="coach@example.com"
            type="email"
            value={coachEmail}
            onChange={(e) => setCoachEmail(e.target.value)}
            style={{ width: '100%', marginTop: 6 }}
          />
        </div>
      )}

      {err && <p className="small" style={{ color: 'crimson', marginTop: 10 }}>{err}</p>}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Continue'}</button>
        <Link className="btn ghost" href="/">Cancel</Link>
      </div>
    </div>
  );
}
