import type { Config } from 'https://edge.netlify.com';

// Production counterpart of the Vite dev proxy (vite.config.ts): the browser calls
// /api/zerion/*, and the API key is added here, server-side, so it never reaches the client.

const PREFIX = '/api/zerion';
const UPSTREAM = 'https://api.zerion.io';

// Only what the app uses — otherwise this is an open proxy spending our key's quota.
const ALLOWED_PATHS = [/^\/v1\/fungibles\/?$/, /^\/v1\/chains\/?$/];

export default async (request: Request) => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const url = new URL(request.url);
  const path = url.pathname.slice(PREFIX.length);
  if (!ALLOWED_PATHS.some((re) => re.test(path))) return new Response('Not found', { status: 404 });

  const key = Netlify.env.get('ZERION_API_KEY');
  if (!key) return new Response('ZERION_API_KEY is not configured', { status: 500 });

  const upstream = await fetch(`${UPSTREAM}${path}${url.search}`, {
    headers: { Authorization: `Basic ${btoa(`${key}:`)}`, Accept: 'application/json' },
  });

  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
  });
  if (upstream.ok) {
    // Shared CDN cache: every visitor asks for the same lists, and the key has a 2000/day quota.
    headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    headers.set('Netlify-Vary', 'query'); // chain filter and page cursor are in the query
  }
  return new Response(upstream.body, { status: upstream.status, headers });
};

export const config: Config = {
  path: '/api/zerion/*',
  cache: 'manual',
};
