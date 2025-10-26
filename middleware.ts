import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protect /uploads by checking for any Supabase auth cookie.
// Supabase sets cookies that start with "sb-" when a user is signed in.
export function middleware(req: NextRequest) {
  const hasSupabaseCookie = req.cookies.getAll().some(c => c.name.startsWith('sb-'));

  if (!hasSupabaseCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Apply only to /uploads (and nested)
export const config = {
  matcher: ['/uploads/:path*'],
};
