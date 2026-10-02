import { ChevronDown, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import { TokenIcon } from '@/components/token-selector/TokenIcon';
import { TokenSelectorDialog } from '@/components/token-selector/TokenSelectorDialog';
import { DEFAULT_CHAIN_ID, useChains } from '@/components/token-selector/useChains';
import type { Token } from '@/components/token-selector/useFungibles';

export function App() {
  const [receive, setReceive] = useState<{ token: Token; chainId: string } | null>(null);
  const [isSelectorOpen, setSelectorOpen] = useState(false);
  const labelId = useId();
  const triggerId = useId();

  // Cached query — also warms the chain list before the selector opens.
  const { data: chains } = useChains();
  const receiveChain = chains?.find((c) => c.id === receive?.chainId);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Zerion Interview</h1>
      </header>

      <section className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <span id={labelId} className="text-muted-foreground text-sm">
          Receive
        </span>
        <button
          id={triggerId}
          type="button"
          aria-haspopup="dialog"
          aria-labelledby={`${labelId} ${triggerId}`}
          onClick={() => setSelectorOpen(true)}
          className="flex items-center gap-2 rounded-full bg-secondary py-1.5 pr-3 pl-1.5 font-medium hover:bg-accent"
        >
          {receive ? (
            <>
              <TokenIcon token={receive.token} chain={receiveChain} size="sm" />
              {receive.token.symbol}
              {receiveChain && (
                <>
                  {' '}
                  <span className="sr-only">on {receiveChain.name}</span>
                </>
              )}
            </>
          ) : (
            <span className="pl-1.5">Select token</span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </section>

      {isSelectorOpen && (
        <TokenSelectorDialog
          title="Receive"
          initialChainId={receive?.chainId ?? DEFAULT_CHAIN_ID}
          onSelect={(token, chainId) => setReceive({ token, chainId })}
          onClose={() => setSelectorOpen(false)}
        />
      )}
    </main>
  );
}
