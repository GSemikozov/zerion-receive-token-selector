import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { nextPageCursor, type ZerionListResponse, zerionGet } from './zerion';

/** The subset of the Zerion `fungibles` resource the selector reads. */
interface ZerionFungible {
  id: string;
  attributes: {
    name: string;
    symbol: string;
    icon: { url: string | null } | null;
    flags: { verified: boolean };
    market_data: {
      price: number | null;
      market_cap: number | null;
      fully_diluted_valuation: number | null;
      changes: { percent_1d: number | null };
    };
  };
}

export interface Token {
  id: string;
  name: string;
  symbol: string;
  iconUrl: string | null;
  verified: boolean;
  price: number | null;
  change1d: number | null;
  marketCap: number | null;
  fdv: number | null;
}

function toToken({ id, attributes: a }: ZerionFungible): Token {
  return {
    id,
    name: a.name,
    symbol: a.symbol,
    iconUrl: a.icon?.url ?? null,
    verified: a.flags.verified,
    price: a.market_data.price,
    change1d: a.market_data.changes.percent_1d,
    marketCap: a.market_data.market_cap || null,
    fdv: a.market_data.fully_diluted_valuation || null,
  };
}

interface FungiblesPage {
  tokens: Token[];
  nextCursor: string | undefined;
}

async function fetchFungiblesPage(
  chainId: string,
  cursor: string | undefined,
  signal: AbortSignal
): Promise<FungiblesPage> {
  const params = new URLSearchParams({
    currency: 'usd',
    sort: '-market_data.market_cap',
    'page[size]': '100',
    // Filter server-side: a client-side filter over the global top 100 leaves small chains near-empty.
    'filter[implementation_chain_id]': chainId,
  });
  if (cursor) params.set('page[after]', cursor);
  const body = await zerionGet<ZerionListResponse<ZerionFungible>>(
    `/v1/fungibles/?${params}`,
    signal
  );
  return { tokens: body.data.map(toToken), nextCursor: nextPageCursor(body.links) };
}

// Cursor pages are sorted by a live market cap, so a token can shift across a page boundary
// and show up twice. Module-level so React Query can memoize the result.
function flattenPages(data: InfiniteData<FungiblesPage>): Token[] {
  const seen = new Set<string>();
  const tokens: Token[] = [];
  for (const token of data.pages.flatMap((page) => page.tokens)) {
    if (seen.has(token.id)) continue;
    seen.add(token.id);
    tokens.push(token);
  }
  return tokens;
}

/** Tokens on a chain by market cap, 100 per page; `data` is the flattened, de-duplicated list. */
export function useFungibles(chainId: string) {
  return useInfiniteQuery({
    queryKey: ['fungibles', chainId],
    queryFn: ({ pageParam, signal }) => fetchFungiblesPage(chainId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: flattenPages,
    // Market caps don't move fast enough to justify burning the daily request quota.
    staleTime: 5 * 60_000,
  });
}
