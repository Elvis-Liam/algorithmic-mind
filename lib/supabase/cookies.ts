import type { CookieOptions } from '@supabase/ssr';

// All auth cookies are set by the server and read by the server only (there is
// no browser Supabase client in this project), so they can be HttpOnly.
export function hardenCookie(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
