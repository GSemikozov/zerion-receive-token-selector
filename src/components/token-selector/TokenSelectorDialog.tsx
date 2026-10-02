import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import { ArrowLeft, CircleAlert, X } from 'lucide-react';
import {
  type MouseEvent,
  type SyntheticEvent,
  type UIEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/cn';
import { ChainTabs } from './ChainTabs';
import { isCoarsePointer } from './media';
import { NetworkList } from './NetworkList';
import { SearchField } from './SearchField';
import { TokenRow } from './TokenRow';
import { useChains } from './useChains';
import { type Token, useFungibles } from './useFungibles';
import { useListNavigation } from './useListNavigation';
import { useSwipeToDismiss } from './useSwipeToDismiss';

const ROW_HEIGHT = 68;
// Start fetching the next page this far before the end, so it usually lands before it's needed.
const LOAD_MORE_THRESHOLD = ROW_HEIGHT * 10;
const SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`);

function filterTokens(tokens: Token[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return tokens;
  return tokens.filter(
    (t) => t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)
  );
}

function statusMessage(
  status: 'pending' | 'error' | 'success',
  isFetchingNextPage: boolean,
  count: number,
  chainName: string | undefined
) {
  if (status === 'pending') return 'Loading tokens…';
  if (isFetchingNextPage) return 'Loading more tokens…';
  if (status === 'error') return ''; // ErrorState is a role="alert"
  const tokens = count === 1 ? '1 token' : `${count} tokens`;
  return chainName ? `${tokens} on ${chainName}` : tokens;
}

interface TokenSelectorDialogProps {
  title: string;
  /** Network selected when the dialog opens. */
  initialChainId: string;
  onSelect: (token: Token, chainId: string) => void;
  /** Fired after the dialog closes for any reason (selection, Esc, backdrop, close button). */
  onClose: () => void;
}

/**
 * Modal token picker. Mount it only while open — search and highlight state reset on every open.
 *
 * Two views in one native <dialog>: the token list (with network chips) and "Browse all
 * networks". Both lists use the combobox pattern via `useListNavigation`.
 */
export function TokenSelectorDialog({
  title,
  initialChainId,
  onSelect,
  onClose,
}: TokenSelectorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const titleId = useId();
  const listboxId = useId();

  const [view, setView] = useState<'tokens' | 'networks'>('tokens');
  const [chainId, setChainId] = useState(initialChainId);
  const [query, setQuery] = useState('');
  const [closing, setClosing] = useState(false);

  const { data: chains } = useChains();
  const {
    data: tokens,
    status,
    isFetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useFungibles(chainId);
  const chain = chains?.find((c) => c.id === chainId);
  const results = tokens ? filterTokens(tokens, query) : [];
  const optionId = (token: Token) => `${listboxId}-${token.id}`;

  // Every way of closing goes through here, so the exit animation always plays (see effect below).
  const requestClose = () => setClosing(true);

  const select = (token: Token) => {
    onSelect(token, chainId);
    requestClose();
  };

  const swipeHandlers = useSwipeToDismiss(dialogRef, requestClose);

  const { active, activeItem, setActiveIndex, onKeyDown } = useListNavigation({
    items: results,
    onSelect: select,
    // Only called from event handlers, after `virtualizer` below is initialised.
    scrollToIndex: (index) => virtualizer.scrollToIndex(index),
  });

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => results[index].id,
    overscan: 6,
    // Keep the highlighted option mounted even when wheel-scrolled out of view, so
    // aria-activedescendant never points at an id that isn't in the DOM.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      return active < 0 || indexes.includes(active)
        ? indexes
        : [...indexes, active].sort((a, b) => a - b);
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    // Guard against StrictMode's double effect run.
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // `data-closing` starts the slide-down / fade-out; close the <dialog> once it has finished. With
  // nothing animating (reduced motion, jsdom) it closes straight away.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!closing || !dialog) return;
    const animations = dialog.getAnimations?.() ?? [];
    if (animations.length === 0) {
      dialog.close();
      return;
    }
    let cancelled = false;
    Promise.allSettled(animations.map((a) => a.finished)).then(() => {
      if (!cancelled) dialog.close();
    });
    return () => {
      cancelled = true;
    };
  }, [closing]);

  // On open and when switching views. Touch: focusing a text field would pop the keyboard over the
  // sheet, so focus the title instead (screen readers start at the top). NetworkList focuses its own
  // search box elsewhere.
  useEffect(() => {
    if (isCoarsePointer()) titleRef.current?.focus();
    else if (view === 'tokens') inputRef.current?.focus();
  }, [view]);

  // A new result set starts from the top. Done in handlers, not an effect, so it can't lag a render.
  const resetHighlight = () => {
    setActiveIndex(0);
    virtualizer.scrollToOffset(0);
  };

  const changeChain = (id: string) => {
    setChainId(id);
    resetHighlight();
  };

  // Driven by scrolling *down*, not by which rows are rendered: a short filtered list never scrolls,
  // so searching can't silently page through the whole chain and burn the request quota. Downward
  // only, because resetting to the top on a new query also fires `scroll`.
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const scrolledDown = el.scrollTop > lastScrollTopRef.current;
    lastScrollTopRef.current = el.scrollTop;
    const nearEnd = el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD;
    if (scrolledDown && nearEnd && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      fetchNextPage();
    }
  };

  // Esc: inside "Browse all networks" go back a level; otherwise close with the exit animation.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (view === 'networks') setView('tokens');
    else requestClose();
  };

  // The dialog's content fills the box, so a click landing on the <dialog> itself hit the backdrop.
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) requestClose();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse shortcut; Esc and the close button cover keyboard users
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClose={onClose}
      onClick={handleBackdropClick}
      data-closing={closing || undefined}
      className={cn(
        'm-auto h-[min(680px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground open:flex',
        'backdrop:bg-black/60 backdrop:backdrop-blur-[4px]',
        // Below 640px it's a bottom sheet, like Zerion: full width, docked, 100px gap at the top.
        'max-sm:mb-0 max-sm:h-[calc(100dvh-100px)] max-sm:w-full max-sm:max-w-none max-sm:rounded-t-[20px] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[env(safe-area-inset-bottom)]',
        // Enter via @starting-style, exit via data-closing: the sheet slides, the modal fades.
        'transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none sm:duration-200',
        'max-sm:starting:open:translate-y-full max-sm:data-closing:translate-y-full',
        'sm:starting:open:opacity-0 sm:data-closing:opacity-0',
        'backdrop:transition-opacity backdrop:duration-300 motion-reduce:backdrop:transition-none starting:open:backdrop:opacity-0 data-closing:backdrop:opacity-0'
      )}
    >
      {/* Drag region for swipe-to-close (sheet layout only). */}
      <div
        {...swipeHandlers}
        className="shrink-0 max-sm:cursor-grab max-sm:touch-none max-sm:active:cursor-grabbing"
      >
        <div aria-hidden className="flex justify-center p-3 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/50" />
        </div>
        <header className="flex items-center gap-2 px-4 pt-5 pb-4 max-sm:pt-0">
          {view === 'networks' && (
            <button
              type="button"
              aria-label="Back to tokens"
              onClick={() => setView('tokens')}
              className="-ml-1 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="flex-1 font-semibold text-xl">
            {view === 'networks' ? 'Networks' : title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={requestClose}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
      </div>

      {view === 'networks' && chains ? (
        <NetworkList
          chains={chains}
          value={chainId}
          onSelect={(id) => {
            changeChain(id);
            setView('tokens');
          }}
        />
      ) : (
        <>
          <SearchField
            ref={inputRef}
            role="combobox"
            aria-label="Search tokens"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
            placeholder="Search tokens"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetHighlight();
            }}
            onKeyDown={onKeyDown}
          />

          <ChainTabs
            chains={chains}
            value={chainId}
            onChange={changeChain}
            onBrowseAll={() => setView('networks')}
          />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            // Chrome makes scrollers Tab stops; this one would be a nameless stop that does nothing
            // the search box's arrow keys don't already do.
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2"
          >
            {status === 'pending' && <TokenListSkeleton />}
            {status === 'error' && <ErrorState retrying={isFetching} onRetry={() => refetch()} />}
            {status === 'success' && results.length === 0 && (
              <EmptyState query={query} chainName={chain?.name} />
            )}

            <div
              id={listboxId}
              role="listbox"
              aria-label="Tokens"
              className="relative"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const token = results[item.index];
                return (
                  <TokenRow
                    key={item.key}
                    id={optionId(token)}
                    token={token}
                    chain={chain}
                    active={item.index === active}
                    position={item.index + 1}
                    setSize={results.length}
                    style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
                    onSelect={() => select(token)}
                    onHover={() => setActiveIndex(item.index)}
                  />
                );
              })}
            </div>

            {isFetchingNextPage && <TokenListSkeleton rows={2} />}
            {isFetchNextPageError && (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  className="rounded-lg bg-secondary px-4 py-2 font-medium text-secondary-foreground text-sm hover:bg-accent"
                >
                  Couldn’t load more · Try again
                </button>
              </div>
            )}
          </div>

          {/* One persistent live region: regions inserted along with their text often go unannounced. */}
          <p role="status" className="sr-only">
            {statusMessage(status, isFetchingNextPage, results.length, chain?.name)}
          </p>
        </>
      )}
    </dialog>
  );
}

/** Purely visual; loading is announced by the dialog's live region. */
function TokenListSkeleton({ rows = SKELETON_KEYS.length }) {
  return (
    <div aria-hidden>
      {SKELETON_KEYS.slice(0, rows).map((key) => (
        <div key={key} className="flex items-center gap-3 px-4" style={{ height: ROW_HEIGHT }}>
          <div className="size-11 shrink-0 rounded-full bg-muted motion-safe:animate-pulse" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-32 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-3 w-44 rounded bg-muted motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden />
      <p className="text-muted-foreground">Couldn’t load tokens.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="rounded-lg bg-secondary px-4 py-2 font-medium text-secondary-foreground text-sm hover:bg-accent disabled:opacity-60"
      >
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}

function EmptyState({ query, chainName }: { query: string; chainName: string | undefined }) {
  const q = query.trim();
  const where = chainName ? ` on ${chainName}` : '';
  return (
    <p className="px-6 py-12 text-center text-muted-foreground">
      {q ? `No tokens match “${q}”${where}` : `No tokens available${where}`}
    </p>
  );
}
