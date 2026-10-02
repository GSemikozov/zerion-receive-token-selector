import { BadgeCheck, Fuel } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { formatCompactUsd, formatPercentChange, formatPrice, roundPercent } from './format';
import { TokenIcon } from './TokenIcon';
import type { Chain } from './useChains';
import type { Token } from './useFungibles';

// FDV is only worth showing when it tells you something MCAP doesn't (e.g. large unlocks ahead).
const FDV_DISPLAY_RATIO = 1.1;

/** Shows the compact label, reads the full one ("MCAP" is otherwise spelled out as letters). */
function Abbr({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span aria-hidden>{short}</span>
      <span className="sr-only">{full}</span>
    </>
  );
}

interface TokenRowProps {
  id: string;
  token: Token;
  chain: Chain | undefined;
  active: boolean;
  /** 1-based. Virtualized: only some options are in the DOM, so the set size must be explicit. */
  position: number;
  setSize: number;
  style: CSSProperties;
  onSelect: () => void;
  onHover: () => void;
}

export function TokenRow({
  id,
  token,
  chain,
  active,
  position,
  setSize,
  style,
  onSelect,
  onHover,
}: TokenRowProps) {
  const { name, symbol, verified, price, change1d, marketCap, fdv } = token;
  const isNative = chain?.nativeFungibleId === token.id;
  const showFdv = fdv !== null && (marketCap === null || fdv / marketCap >= FDV_DISPLAY_RATIO);
  // Colour by the value the user actually sees, so -0.004% renders as a neutral "0%", not a red one.
  const change = change1d === null ? null : roundPercent(change1d);

  return (
    // Keyboard interaction lives on the combobox input (aria-activedescendant), not on each option.
    // biome-ignore lint/a11y/useKeyWithClickEvents: see above
    <div
      id={id}
      role="option"
      aria-selected={active}
      aria-posinset={position}
      aria-setsize={setSize}
      tabIndex={-1}
      style={style}
      onClick={onSelect}
      onMouseMove={active ? undefined : onHover}
      className={cn(
        'absolute inset-x-0 top-0 flex cursor-pointer items-center gap-3 px-4',
        // Background alone is 1.2:1 against the list; the bar makes the highlight meet 3:1.
        active && 'bg-accent shadow-[inset_3px_0_0_var(--color-highlight)]'
      )}
    >
      <TokenIcon token={token} chain={chain} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium">{name}</span>{' '}
          {isNative ? (
            <Fuel
              role="img"
              aria-label={`Native ${chain?.name} token, used for gas`}
              className="size-4 shrink-0 text-foreground"
            />
          ) : (
            verified && (
              <BadgeCheck
                role="img"
                aria-label="Verified"
                className="size-4.5 shrink-0 fill-primary text-popover"
              />
            )
          )}
        </div>
        <p className="truncate text-muted-foreground text-sm">
          <span>{symbol}</span>
          {marketCap !== null && (
            <>
              {' · '}
              <Abbr short="MCAP" full="market cap" />{' '}
              <span className="text-foreground">{formatCompactUsd(marketCap)}</span>
            </>
          )}
          {showFdv && (
            <>
              {' · '}
              <Abbr short="FDV" full="fully diluted valuation" />{' '}
              <span className="text-foreground">{formatCompactUsd(fdv)}</span>
            </>
          )}
        </p>
      </div>

      {price !== null && (
        <div className="shrink-0 text-right">
          <div className="font-medium text-sm tabular-nums">
            <span className="sr-only">, price</span> {formatPrice(price)}
          </div>
          {change !== null && (
            <div
              className={cn(
                'text-xs tabular-nums',
                change > 0 && 'text-success',
                change < 0 && 'text-destructive',
                change === 0 && 'text-muted-foreground'
              )}
            >
              <span className="sr-only">, 24-hour change</span> {formatPercentChange(change)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
