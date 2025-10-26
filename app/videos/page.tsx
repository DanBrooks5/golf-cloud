'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';

const supabase = supabaseBrowser();

const CLUBS = [
  'Driver','3W','5W','7W',
  '3H','4H','5H',
  '2I','3I','4I','5I','6I','7I','8I','9I',
  'PW','GW','SW','LW',
  'Putter','Other'
] as const;

const SHOT_TYPES = [
  'stock','neutral','draw','fade','flighted','high','stinger'
] as const;

type VideoRow = {
  id: string;
  s3_key: string;
  s3_url: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  club: string | null;
  shot_type: string | null;
};

type SortKey = 'newest' | 'oldest' | 'rating_desc' | 'rating_asc';

export default function VideosPage() {
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription.unsubscribe();
  }, []);

  // Load list
  useEffect(() => {
    if (!session?.user) return;
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, sortBy]);

  async function loadVideos() {
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase
        .from('videos')
        .select('id, s3_key, s3_url, rating, comment, created_at, club, shot_type');

      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
      else if (sortBy === 'rating_desc') query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
      else if (sortBy === 'rating_asc') query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        setLoadError(error.message);
        setVideos([]);
      } else {
        setVideos((data || []) as any);
      }
    } catch (e: any) {
      setLoadError(e.message || 'Unknown error');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateRating(id: string, rating: number) {
    const { error } = await supabase.from('videos').update({ rating }).eq('id', id);
    if (error) return alert(error.message);
    setVideos(videos.map(v => v.id === id ? { ...v, rating } : v));
  }

  async function updateComment(id: string, comment: string) {
    const { error } = await supabase.from('videos').update({ comment }).eq('id', id);
    if (error) return alert(error.message);
    setVideos(videos.map(v => v.id === id ? { ...v, comment } : v));
  }

  async function updateClub(id: string, club: string) {
    const { error } = await supabase.from('videos').update({ club }).eq('id', id);
    if (error) return alert(error.message);
    setVideos(videos.map(v => v.id === id ? { ...v, club } : v));
  }

  async function updateShotType(id: string, shot_type: string) {
    const { error } = await supabase.from('videos').update({ shot_type }).eq('id', id);
    if (error) return alert(error.message);
    setVideos(videos.map(v => v.id === id ? { ...v, shot_type } : v));
  }

  async function deleteVideo(v: VideoRow) {
    const ok = confirm('Delete this video? This cannot be undone.');
    if (!ok) return;

    try {
      await fetch('/api/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: v.s3_key }),
      });
    } catch {}

    const { error } = await supabase.from('videos').delete().eq('id', v.id);
    if (error) return alert(error.message);
    setVideos(prev => prev.filter(x => x.id !== v.id));
  }

  // Guards
  if (checkingAuth) return <div className="card"><p>Checking your session…</p></div>;
  if (!session?.user) {
    return (
      <div className="card">
        <p>You are not signed in.</p>
        <Link className="btn" href="/signin">Go to sign in</Link>
      </div>
    );
  }

  // UI
  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Your videos</h2>
          <select
            className="input"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="rating_desc">Highest rated</option>
            <option value="rating_asc">Lowest rated</option>
          </select>
        </div>

        {loading && <p className="small">Loading…</p>}
        {!loading && loadError && <p className="small" style={{ color: 'crimson' }}>Error: {loadError}</p>}
        {!loading && !loadError && videos.length === 0 && <p className="small">No videos yet.</p>}

        <div className="video-grid" style={{ marginTop: 16 }}>
          {videos.map(v => (
            <VideoCard
              key={v.id}
              v={v}
              onRate={updateRating}
              onClub={updateClub}
              onShotType={updateShotType}
              onComment={updateComment}
              onDelete={deleteVideo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoCard({
  v,
  onRate,
  onClub,
  onShotType,
  onComment,
  onDelete,
}: {
  v: VideoRow;
  onRate: (id: string, rating: number) => void;
  onClub: (id: string, club: string) => void;
  onShotType: (id: string, shot_type: string) => void;
  onComment: (id: string, comment: string) => void;
  onDelete: (v: VideoRow) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className="video-card"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 16,
        background: '#fff',
        maxWidth: 480,
        margin: 'auto',
      }}
    >
      {/* Video */}
      <div
        ref={wrapRef}
        style={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 12,
          background: '#fff',
          maxHeight: 640,
        }}
      >
        <video
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const vid = e.currentTarget;
            const portrait = vid.videoHeight > vid.videoWidth;
            if (wrapRef.current) {
              wrapRef.current.style.aspectRatio = portrait ? '9 / 16' : '16 / 9';
            }
          }}
          src={v.s3_url}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="small">Rating</span>
          <select
            className="input"
            value={v.rating ?? ''}
            onChange={(e) => onRate(v.id, Number(e.target.value))}
            style={{ maxWidth: 120 }}
          >
            <option value="">—</option>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {typeof v.rating === 'number' && (
            <span className="small">({v.rating}/10)</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="small">Club</span>
          <select
            className="input"
            value={v.club ?? ''}
            onChange={(e) => onClub(v.id, e.target.value)}
            style={{ maxWidth: 160 }}
          >
            <option value="">—</option>
            {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="small">Type</span>
          <select
            className="input"
            value={v.shot_type ?? ''}
            onChange={(e) => onShotType(v.id, e.target.value)}
            style={{ maxWidth: 180, textTransform: 'capitalize' }}
          >
            <option value="">—</option>
            {SHOT_TYPES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <input
          className="input"
          placeholder="Swing thoughts…"
          defaultValue={v.comment ?? ''}
          onBlur={(e) => onComment(v.id, e.target.value)}
        />

        <button
          className="btn danger"
          onClick={() => onDelete(v)}
          style={{ marginTop: 4 }}
        >
          Delete
        </button>

        <div className="small" style={{ color: '#6b7280' }}>
          Uploaded: {new Date(v.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

