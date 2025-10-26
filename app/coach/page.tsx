'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import Link from 'next/link';

const supabase = supabaseBrowser();

export default function CoachPage() {
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rows, setRows] = useState<{ id: string; coach_email: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription.unsubscribe();
  }, []);

  async function refreshCoaches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/list');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to load');
      setRows(j.coaches || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session?.user) return;
    refreshCoaches();
    const handler = () => refreshCoaches();
    window.addEventListener('coach:refresh', handler);
    return () => window.removeEventListener('coach:refresh', handler);
  }, [session?.user]);

  if (checkingAuth) return <div className="card"><p>Checking your session…</p></div>;
  if (!session?.user) {
    return (
      <div className="card">
        <p>You are not signed in.</p>
        <Link className="btn" href="/signin">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Share with your coach</h2>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const input = form.elements.namedItem('coachEmail') as HTMLInputElement;
          const email = (input?.value || '').trim();
          if (!email) return;

          const res = await fetch('/api/coach/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coachEmail: email }),
          });
          const j = await res.json();
          if (!res.ok) { alert(j.error || 'Failed to add coach'); return; }
          input.value = '';
          window.dispatchEvent(new CustomEvent('coach:refresh'));
        }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <input
          className="input"
          name="coachEmail"
          type="email"
          placeholder="coach@example.com"
          required
          style={{ minWidth: 260, flex: 1 }}
        />
        <button className="btn" type="submit">Grant access</button>
      </form>

      <div style={{ marginTop: 12 }}>
        {loading && rows.length === 0 && <p className="small">Loading…</p>}
        {error && rows.length === 0 && <p className="small">Error: {error}</p>}
        {!loading && !error && rows.length === 0 && <p className="small">No coaches yet.</p>}

        {!!rows.length && (
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{r.coach_email}</span>
                <button
                  className="btn danger"
                  style={{ marginLeft: 'auto' }}
                  onClick={async () => {
                    const res = await fetch('/api/coach/revoke', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ coachEmail: r.coach_email }),
                    });
                    const j = await res.json();
                    if (!res.ok) { alert(j.error || 'Failed to revoke'); return; }
                    setRows(prev => prev.filter(x => x.id !== r.id));
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

