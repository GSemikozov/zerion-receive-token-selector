import { useQuery } from '@tanstack/react-query';
import { type ZerionListResponse, zerionGet } from './zerion';

/** The subset of the Zerion `chains` resource the selector reads. */
interface ZerionChain {
  id: string;
  attributes: {
    name: string;
    icon: { url: string | null } | null;
    flags: { supports_trading: boolean };
  };
  relationships: {
    native_fungible?: { data: { id: string } };
  };
}

export interface Chain {
  id: string;
  name: string;
  iconUrl: string | null;
  nativeFungibleId: string | null;
}

export const DEFAULT_CHAIN_ID = 'ethereum';

// The API returns chains alphabetically; surface the ones most people swap on first.
const POPULAR_CHAIN_IDS = [
  'ethereum',
  'solana',
  'base',
  'binance-smart-chain',
  'arbitrum',
  'polygon',
  'optimism',
  'avalanche',
];

export function isPopularChain(id: string) {
  return POPULAR_CHAIN_IDS.includes(id);
}

function popularityRank(id: string) {
  const index = POPULAR_CHAIN_IDS.indexOf(id);
  return index === -1 ? POPULAR_CHAIN_IDS.length : index;
}

function toChain({ id, attributes: a, relationships: r }: ZerionChain): Chain {
  return {
    id,
    name: a.name,
    iconUrl: a.icon?.url ?? null,
    nativeFungibleId: r.native_fungible?.data.id ?? null,
  };
}

async function fetchChains(signal: AbortSignal): Promise<Chain[]> {
  const body = await zerionGet<ZerionListResponse<ZerionChain>>('/v1/chains/', signal);
  return (
    body.data
      // Receive side of a swap: only chains we can actually trade on.
      .filter((c) => c.attributes.flags.supports_trading)
      .map(toChain)
      .sort((a, b) => popularityRank(a.id) - popularityRank(b.id) || a.name.localeCompare(b.name))
  );
}

export function useChains() {
  return useQuery({
    queryKey: ['chains'],
    queryFn: ({ signal }) => fetchChains(signal),
    staleTime: 60 * 60_000,
  });
}
