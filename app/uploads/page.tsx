// app/uploads/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function UploadsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // form fields
  const [club, setClub] = useState<string>('');
  const [rating, setRating] = useState<string>('');     // 1..10 or ''
  const [shotType, setShotType] = useState<string>(''); // from SHOT_TYPES

  // selected file preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileRef   = useRef<HTMLInputElement | null>(null);
  const recordRef = useRef<HTMLInputElement | null>(null);

  // Auth bootstrap
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateFile(file: File): boolean {
    const maxBytes = 500 * 1024 * 1024;
    const okTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg'];
    if (!okTypes.includes(file.type)) { alert('Please upload MP4/MOV/WEBM/OGG.'); return false; }
    if (file.size > maxBytes) { alert('File too large (max 500MB).'); return false; }
    return true;
  }

  function setPreviewFor(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) { setPreviewUrl(null); return; }
    setPreviewUrl(URL.createObjectURL(file));
  }

  function onPickFile(input: HTMLInputElement | null) {
    const f = input?.files?.[0] ?? null;
    if (!f) { setPreviewFor(null); return; }
    if (!validateFile(f)) { if (input) input.value = ''; setPreviewFor(null); return; }
    setPreviewFor(f);
  }

  async function handleUpload(): Promise<void> {
    if (!session?.user) { alert('Please sign in'); return; }

    // prefer recorded > picked
    const file =
      recordRef.current?.files?.[0] ||
      fileRef.current?.files?.[0] ||
      null;

    if (!file) { alert('Pick or record a video first'); return; }
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1) presigned POST
      const res = await fetch('/api/s3/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          userId: session.user.id,
        }),
      });
      const json: {
        url: string;
        fields: Record<string, string>;
        key: string;
        publicUrl: string;
        error?: string;
      } = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create upload');

      // 2) upload to S3
      const form = new FormData();
      Object.entries(json.fields).forEach(([k, v]) => form.append(k, String(v)));
      form.append('file', file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', json.url);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });

      // 3) insert DB row with labels
      const ratingNumber = rating ? Number(rating) : null;
      const { error: dbErr } = await supabase.from('videos').insert({
        user_id: session.user.id,
        s3_key: json.key,
        s3_url: json.publicUrl,
        rating: ratingNumber,
        comment: null,
        club: club || null,
        shot_type: shotType || null,
      });
      if (dbErr) throw new Error(dbErr.message);

      // reset UI
      if (fileRef.current) fileRef.current.value = '';
      if (recordRef.current) recordRef.current.value = '';
      setClub(''); setRating(''); setShotType('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setProgress(0);
      alert('Uploaded! Check your Videos page.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      alert(msg);
    } finally {
      setUploading(false);
    }
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
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Record or upload a swing</h2>

      {/* Labels */}
      <div style={{ display:'grid', gap:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <label htmlFor="club" className="small" style={{ minWidth: 72 }}>Club</label>
          <select
            id="club"
            className="input"
            value={club}
            onChange={e => setClub(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">—</option>
            {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <label htmlFor="rating" className="small" style={{ minWidth: 72 }}>Rating</label>
          <select
            id="rating"
            className="input"
            value={rating}
            onChange={e => setRating(e.target.value)}
            style={{ maxWidth: 140 }}
          >
            <option value="">—</option>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {rating ? <span className="small">({rating}/10)</span> : null}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <label htmlFor="shotType" className="small" style={{ minWidth: 72 }}>Shot type</label>
          <select
            id="shotType"
            className="input"
            value={shotType}
            onChange={e => setShotType(e.target.value)}
            style={{ maxWidth: 220, textTransform:'capitalize' }}
          >
            <option value="">—</option>
            {SHOT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Pick/Record controls */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        <label className="btn" style={{ cursor:'pointer' }}>
          Record
          <input
            ref={recordRef}
            type="file"
            accept="video/*"
            // @ts-ignore - React's type defs don't include 'capture' in some versions
            capture="environment"
            style={{ display:'none' }}
            onChange={() => onPickFile(recordRef.current)}
          />
        </label>

        <label className="btn" style={{ cursor:'pointer' }}>
          Choose file
          <input
            id="file-upload"
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display:'none' }}
            onChange={() => onPickFile(fileRef.current)}
          />
        </label>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div style={{ width:'100%', overflow:'hidden', borderRadius:12, marginBottom:10 }}>
          <video
            src={previewUrl}
            controls
            playsInline
            preload="metadata"
            style={{ width:'100%', height:'auto', display:'block', objectFit:'cover' }}
          />
        </div>
      )}

      {/* Upload */}
      <button className="btn" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading…' : 'Upload to S3'}
      </button>
      {uploading && (
        <>
          <div className="progress"><div style={{ width: `${progress}%` }} /></div>
          <div className="small">{progress}%</div>
        </>
      )}
    </div>
  );
}
