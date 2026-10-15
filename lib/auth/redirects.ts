// Post sign in redirect validation. Only same-origin paths under an allowlisted
// prefix survive. Everything else falls back. No imports, safe anywhere.

export const DEFAULT_LANDING = '/studio';
const ALLOWED_PREFIXES = ['/studio', '/admin', '/account'] as const;

function hasForbiddenChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return true; // control chars, backslash
  }
  return false;
}

export function safeRedirectPath(candidate: unknown, fallback: string = DEFAULT_LANDING): string {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 512) {
    return fallback;
  }
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (hasForbiddenChars(candidate)) return fallback;

  let url: URL;
  try {
    url = new URL(candidate, 'http://redirect.invalid');
  } catch {
    return fallback;
  }
  if (url.origin !== 'http://redirect.invalid') return fallback;

  const path = url.pathname; // dot segments are normalised by URL
  const allowed = ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  return allowed ? `${path}${url.search}` : fallback;
}
