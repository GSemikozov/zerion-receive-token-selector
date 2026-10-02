import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { Chain } from './useChains';
import type { Token } from './useFungibles';

interface AssetIconProps {
  src: string | null;
  /** Its first letter is the fallback when there's no image or it fails to load. */
  label: string;
  className?: string;
}

/** Decorative image with a letter fallback. Sized and shaped via `className`. */
export function AssetIcon({ src, label, className }: AssetIconProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground',
          className
        )}
      >
        {label.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={cn('size-11 shrink-0 rounded-full bg-muted object-cover', className)}
    />
  );
}

const SIZES = {
  sm: { token: 'size-7 text-xs', badge: 'size-3.5 text-[6px] ring-secondary' },
  md: { token: 'size-11', badge: 'size-4.5 text-[8px] ring-popover' },
};

interface TokenIconProps {
  token: Token;
  chain?: Chain;
  size?: keyof typeof SIZES;
}

/** Token logo with the network it lives on as a corner badge. */
export function TokenIcon({ token, chain, size = 'md' }: TokenIconProps) {
  const classes = SIZES[size];
  return (
    <span className="relative shrink-0">
      <AssetIcon src={token.iconUrl} label={token.symbol} className={classes.token} />
      {chain && (
        <AssetIcon
          src={chain.iconUrl}
          label={chain.name}
          className={cn('-right-0.5 -bottom-0.5 absolute rounded-md ring-2', classes.badge)}
        />
      )}
    </span>
  );
}
