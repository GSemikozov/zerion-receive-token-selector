import { Globe } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { AssetIcon } from './TokenIcon';
import { type Chain, isPopularChain } from './useChains';

const SKELETON_KEYS = ['a', 'b', 'c', 'd'];

interface ChainTabsProps {
  /** `undefined` while loading. */
  chains: Chain[] | undefined;
  value: string;
  onChange: (chainId: string) => void;
  onBrowseAll: () => void;
}

/**
 * Single-select network filter, built on native radio inputs: the browser provides the single
 * Tab stop and arrow-key selection. Each visually hidden input is wrapped in a chip-styled label.
 *
 * Shows the popular networks plus the selected one; the rest are behind "Browse all networks".
 */
export function ChainTabs({ chains, value, onChange, onBrowseAll }: ChainTabsProps) {
  const name = useId();
  const chipRefs = useRef(new Map<string, HTMLLabelElement>());

  // Keep the selected chip in view, e.g. when reopening with a chain far along the row.
  useEffect(() => {
    if (!chains) return;
    chipRefs.current.get(value)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [chains, value]);

  if (!chains) {
    return (
      <div aria-hidden className="flex gap-2 overflow-hidden px-4 pb-3">
        {SKELETON_KEYS.map((key) => (
          <div
            key={key}
            className="h-10 w-28 shrink-0 rounded-full bg-muted motion-safe:animate-pulse"
          />
        ))}
      </div>
    );
  }

  const visibleChains = chains.filter((c) => isPopularChain(c.id) || c.id === value);

  return (
    <div className="flex items-center gap-1 px-4 pb-3">
      {/* Not a <fieldset>: its anonymous scroll box ignores scroll-padding, which keeps the
          selected chip clear of the fade when scrolled into view. */}
      <div
        role="radiogroup"
        aria-label="Network"
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-pr-12 py-0.5 pr-12 pl-0.5 mask-r-from-85% [scrollbar-width:none]"
      >
        {visibleChains.map((chain) => {
          const checked = chain.id === value;
          return (
            <label
              key={chain.id}
              ref={(el) => {
                if (el) chipRefs.current.set(chain.id, el);
                return () => {
                  chipRefs.current.delete(chain.id);
                };
              }}
              className={cn(
                'relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 pr-3.5 pl-2 font-semibold text-sm',
                // Offset, or the ring merges into the selected chip's own blue border.
                'has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-popover',
                checked
                  ? 'border-primary text-highlight'
                  : 'border-border text-foreground hover:bg-accent'
              )}
            >
              <input
                type="radio"
                name={name}
                value={chain.id}
                checked={checked}
                onChange={() => onChange(chain.id)}
                className="sr-only"
              />
              <AssetIcon
                src={chain.iconUrl}
                label={chain.name}
                className="size-6 rounded-md text-xs"
              />
              {chain.name}
            </label>
          );
        })}
      </div>

      <BrowseAllButton onClick={onBrowseAll} />
    </div>
  );
}

/**
 * Globe button with a Zerion-style tooltip that meets WCAG 1.4.13: it shows on hover and
 * keyboard focus, stays while the pointer moves onto it, and Esc dismisses it.
 */
function BrowseAllButton({ onClick }: { onClick: () => void }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // Capture phase and preventDefault, so the same Esc doesn't also close the whole dialog.
  useEffect(() => {
    if (!tooltipOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setTooltipOpen(false);
    };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [tooltipOpen]);

  return (
    <button
      type="button"
      aria-label="Browse all networks"
      onClick={onClick}
      onPointerEnter={() => setTooltipOpen(true)}
      onPointerLeave={() => setTooltipOpen(false)}
      onFocus={(event) => setTooltipOpen(event.currentTarget.matches(':focus-visible'))}
      onBlur={() => setTooltipOpen(false)}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border hover:bg-accent"
    >
      <Globe className="size-5" aria-hidden />
      {tooltipOpen && (
        // Duplicates the button's name, so hidden from AT. Padding (not margin) bridges the gap,
        // keeping the pointer "inside" the button on its way to the tooltip.
        <span aria-hidden className="absolute right-0 bottom-full pb-2">
          <span className="block whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm">
            Browse all networks
          </span>
        </span>
      )}
    </button>
  );
}
