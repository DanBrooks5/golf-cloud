// app/api/videos/list/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const revalidate = 0; // always fresh

export async function GET() {
  try {
    // Supabase server client with first-party cookie handling (no custom adapter)
    const supabase = createRouteHandlerClient({ cookies });

    // Who is calling?
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ videos: [] });
    }

    // Optional coach access: if the table/policy isn't ready, ignore silently.
    let playerIds: string[] = [];
    try {
      const { data: accessRows, error: accessErr } = await supabase
        .from('coach_access')
        .select('player_id')
        .eq('coach_email', user.email ?? '');

      if (!accessErr && accessRows) {
        playerIds = accessRows.map((r: any) => r.player_id).filter(Boolean);
      }
    } catch {
      // ignore if table missing
    }

    const ownersToShow = [user.id, ...playerIds];

    // Adjust the selected columns to your schema if needed
    const { data: rows, error: vidsErr } = await supabase
      .from('videos')
      .select('id, name, url, s3_key, rating, created_at, user_id')
      .in('user_id', ownersToShow)
      .order('created_at', { ascending: false });

    if (vidsErr) {
      console.error('videos read error:', vidsErr.message);
      return NextResponse.json({ error: 'Failed to load videos' }, { status: 500 });
    }

    // If you store only s3_key, build a public URL; otherwise prefer the url column.
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';

    const videos =
      (rows ?? [])
        .map((r: any) => {
          let finalUrl: string | null = r.url ?? null;
          if (!finalUrl && r.s3_key && bucket) {
            finalUrl = `https://${bucket}.s3.${region}.amazonaws.com/${r.s3_key}`;
          }
          return {
            id: r.id,
            name: r.name ?? r.s3_key ?? 'video',
            url: finalUrl,
            rating: r.rating,
            user_id: r.user_id,
            created_at: r.created_at,
          };
        })
        .filter((v: any) => Boolean(v.url)); // keep only usable rows

    return NextResponse.json({ videos });
  } catch (e: any) {
    console.error('Unexpected error in /api/videos/list:', e?.message || e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
