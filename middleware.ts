import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Authentication gate and session refresh. Role checks happen in the layouts
// and route handlers (lib/auth/guards.ts, lib/auth/authorize.ts), because they
// need the profile row. Public pages are deliberately not matched: setting
// cookies on them would make them uncacheable at the CDN, and they render no
// auth state.

const PROTECTED = [/^\/studio(\/|$)/, /^\/admin(\/|$)/, /^\/account(\/|$)/, /^\/api\/admin(\/|$)/];

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // API clients presenting a bearer token are verified by authorize() in the handler.
  if (isApi && request.headers.get('authorization')?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const isProtected = PROTECTED.some((pattern) => pattern.test(pathname));

  if (isProtected && !user) {
    let denied: NextResponse;
    if (isApi) {
      denied = NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.search = '';
      url.searchParams.set('next', `${pathname}${search}`);
      denied = NextResponse.redirect(url);
    }
    copyCookies(response, denied);
    denied.headers.set('Cache-Control', 'no-store');
    return denied;
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: [
    '/studio/:path*',
    '/admin/:path*',
    '/account/:path*',
    '/api/admin/:path*',
    '/sign-in',
    '/access-denied',
  ],
};
