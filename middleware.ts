import { next } from '@vercel/functions';

export const config = {
  matcher: ['/laws/:slug', '/assessment/:slug'],
};

async function notFound(request: Request) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
    'X-Content-Type-Options': 'nosniff',
  };
  if (request.method === 'HEAD') return new Response(null, { status: 404, headers });

  try {
    const page = await fetch(new URL('/404.html', request.url), { signal: AbortSignal.timeout(2000) });
    if (page.ok) return new Response(page.body, { status: 404, headers });
  } catch {
    // A failure to load the design does not change the route's HTTP status.
  }

  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found | POWERLAB</title><main><h1>Page not found</h1><a href="/laws">Browse the 48 laws</a></main></html>', { status: 404, headers });
}

export default async function middleware(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  const { pathname } = new URL(request.url);
  const route = pathname.match(/^\/(laws|assessment)\/([^/]+)\/?$/i);
  if (!route || pathname.toLowerCase().replace(/\/$/, '') === '/assessment/final') return next();

  let slug: string;
  try {
    slug = decodeURIComponent(route[2]);
  } catch {
    return notFound(request);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 150) return notFound(request);

  const projectUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !publishableKey) return next();

  try {
    const url = new URL('/rest/v1/content_laws', projectUrl);
    url.search = new URLSearchParams({ select: 'slug', slug: `eq.${slug}`, is_published: 'eq.true', limit: '1' }).toString();
    const result = await fetch(url, { headers: { apikey: publishableKey }, signal: AbortSignal.timeout(2500) });
    if (result.ok) {
      const rows: unknown = await result.json();
      if (Array.isArray(rows) && rows.length === 0) return notFound(request);
    }
  } catch {
    // Let the app handle transient catalogue errors. Only a successful empty lookup is a 404.
  }

  return next();
}
