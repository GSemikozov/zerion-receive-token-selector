import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { isCoarsePointer } from './media';
import { SearchField } from './SearchField';
import { AssetIcon } from './TokenIcon';
import type { Chain } from './useChains';
import { useListNavigation } from './useListNavigation';

/** 0: name starts with the query, 1: a later word does ("chain" → BNB Chain), 2: substring. */
function matchRank(name: string, q: string) {
  const lower = name.toLowerCase();
  if (lower.startsWith(q)) return 0;
  if (lower.split(/\s+/).some((word) => word.startsWith(q))) return 1;
  return 2;
}

interface NetworkListProps {
  chains: Chain[];
  value: string;
  onSelect: (chainId: string) => void;
}

/** "Browse all networks" view: every network, current one first, the rest alphabetical. */
export function NetworkList({ chains, value, onSelect }: NetworkListProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  // Searching: best match first. Browsing: current network first. Ties alphabetical.
  const rank = (chain: Chain) => (q ? matchRank(chain.name, q) : Number(chain.id !== value));
  const results = chains
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const { active, activeItem, setActiveIndex, onKeyDown } = useListNavigation({
    items: results,
    onSelect: (chain) => onSelect(chain.id),
    scrollToIndex: (index) =>
      listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' }),
  });
  const optionId = (chain: Chain) => `${listboxId}-${chain.id}`;

  // On touch the dialog focuses its title instead, so the keyboard doesn't cover the list.
  useEffect(() => {
    if (!isCoarsePointer()) inputRef.current?.focus();
  }, []);

  return (
    <>
      <SearchField
        ref={inputRef}
        role="combobox"
        aria-label="Search networks"
        aria-expanded="true"
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
        placeholder="Search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          if (listRef.current?.parentElement) listRef.current.parentElement.scrollTop = 0;
        }}
        onKeyDown={onKeyDown}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
        <div ref={listRef} id={listboxId} role="listbox" aria-label="Networks">
          {results.map((chain, index) => (
            // Keyboard interaction lives on the combobox input (aria-activedescendant).
            // biome-ignore lint/a11y/useKeyWithClickEvents: see above
            <div
              key={chain.id}
              id={optionId(chain)}
              role="option"
              aria-selected={index === active}
              aria-checked={chain.id === value}
              tabIndex={-1}
              onClick={() => onSelect(chain.id)}
              onMouseMove={index === active ? undefined : () => setActiveIndex(index)}
              className={cn(
                'flex h-14 cursor-pointer items-center gap-3 px-4',
                index === active && 'bg-accent'
              )}
            >
              <AssetIcon
                src={chain.iconUrl}
                label={chain.name}
                className="size-6 rounded-md text-xs"
              />
              <span className="flex-1 truncate font-medium">{chain.name}</span>
              {chain.id === value && (
                <>
                  <Check className="size-5 text-highlight" aria-hidden />
                  {/* aria-checked on options is poorly announced; say it. */}
                  <span className="sr-only">, current network</span>
                </>
              )}
            </div>
          ))}
        </div>
        {results.length === 0 && (
          <p className="px-6 py-12 text-center text-muted-foreground">
            No networks match “{query.trim()}”
          </p>
        )}
      </div>

      <p role="status" className="sr-only">
        {results.length === 1 ? '1 network' : `${results.length} networks`}
      </p>
    </>
  );
}
