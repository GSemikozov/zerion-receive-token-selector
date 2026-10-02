import { HttpError } from '@/lib/http';

export interface ZerionListResponse<T> {
  data: T[];
  links?: { next?: string };
}

/** GET a Zerion API path through the Vite proxy (see vite.config.ts), which adds the API key. */
export async function zerionGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(`/api/zerion${path}`, { signal });
  if (!res.ok) throw new HttpError(res.status, `Zerion API ${path} failed (${res.status})`);
  return res.json();
}

/** The `page[after]` cursor from a Zerion `links.next` URL; `undefined` on the last page. */
export function nextPageCursor(links: ZerionListResponse<unknown>['links']) {
  if (!links?.next) return undefined;
  return new URL(links.next).searchParams.get('page[after]') ?? undefined;
}
