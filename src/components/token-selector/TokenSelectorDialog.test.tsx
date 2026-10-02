import { fireEvent, screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { renderWithQuery } from '@/test/render';

type User = ReturnType<typeof userEvent.setup>;

function chain(id: string, name: string, nativeFungibleId: string, supportsTrading = true) {
  return {
    type: 'chains',
    id,
    attributes: {
      name,
      icon: { url: `https://cdn.example/${id}.png` },
      flags: { supports_trading: supportsTrading },
    },
    relationships: { native_fungible: { data: { type: 'fungibles', id: nativeFungibleId } } },
  };
}

function fungible(id: string, name: string, symbol: string, marketCap: number, fdv = marketCap) {
  return {
    type: 'fungibles',
    id,
    attributes: {
      name,
      symbol,
      icon: { url: `https://cdn.example/${id}.png` },
      flags: { verified: true },
      market_data: {
        price: 1,
        market_cap: marketCap,
        fully_diluted_valuation: fdv,
        changes: { percent_1d: 0.5 },
      },
    },
  };
}

// Alphabetical, like the API.
const CHAINS = [
  chain('arbitrum', 'Arbitrum', 'eth'),
  chain('avalanche', 'Avalanche', 'avax'),
  chain('base', 'Base', 'eth'),
  chain('blast', 'Blast', 'eth'),
  chain('dead', 'Dead Chain', 'dead', false),
  chain('ethereum', 'Ethereum', 'eth'),
];

const USDT = fungible('usdt', 'Tether USD', 'USDT', 183_300_000_000);
const FUNGIBLES_BY_CHAIN: Record<string, unknown[]> = {
  ethereum: [
    USDT,
    fungible('usdc', 'USDC', 'USDC', 73_800_000_000),
    fungible('link', 'Chainlink', 'LINK', 8_900_000_000, 11_900_000_000),
  ],
  avalanche: [USDT, fungible('avax', 'Avalanche', 'AVAX', 3_500_000_000)],
  base: [],
  blast: [fungible('blast', 'Blast', 'BLAST', 100_000_000)],
};
// Ethereum has a second page; USDT reappears on it, as live market-cap sorting can cause.
const ETHEREUM_PAGE_2 = [USDT, fungible('dai', 'Dai Stablecoin', 'DAI', 4_500_000_000)];
const NEXT_LINK = 'https://api.zerion.io/v1/fungibles/?page%5Bafter%5D=cursor-2&page%5Bsize%5D=100';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Routes fetches like the Zerion API. `overrides` answer the next fungibles requests first. */
function mockApi(...overrides: Array<Response | Promise<Response>>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname.endsWith('/v1/chains/')) return json({ data: CHAINS });
    const override = overrides.shift();
    if (override) return override;
    const chainId = url.searchParams.get('filter[implementation_chain_id]') ?? '';
    if (chainId === 'ethereum') {
      return url.searchParams.get('page[after]') === 'cursor-2'
        ? json({ data: ETHEREUM_PAGE_2 })
        : json({ data: FUNGIBLES_BY_CHAIN.ethereum, links: { next: NEXT_LINK } });
    }
    return json({ data: FUNGIBLES_BY_CHAIN[chainId] ?? [] });
  });
}

async function openSelector(user: User) {
  await user.click(screen.getByRole('button', { name: /^receive/i }));
  return screen.getByRole('dialog', { name: 'Receive' });
}

const search = () => screen.getByRole('combobox', { name: 'Search tokens' });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TokenSelectorDialog', () => {
  it('shows a loading state, then the tokens with market data', async () => {
    let respond: (res: Response) => void = () => {};
    mockApi(
      new Promise((resolve) => {
        respond = resolve;
      })
    );
    const user = renderWithQuery(<App />);
    const dialog = await openSelector(user);

    expect(within(dialog).getByRole('status')).toHaveTextContent('Loading tokens…');
    respond(json({ data: FUNGIBLES_BY_CHAIN.ethereum }));

    const usdt = await within(dialog).findByRole('option', { name: /Tether USD/ });
    // What a screen reader hears: abbreviations expanded, price and change labelled.
    expect(usdt).toHaveAccessibleName(
      // (The name algorithm puts a space between block elements, before each comma.)
      /^Tether USD Verified USDT · market cap \$183\.3B ?, price \$1\.00 ?, 24-hour change \+0\.5%$/
    );
    expect(usdt).toHaveTextContent('USDT · MCAP');
    // FDV is only shown when it meaningfully differs from market cap.
    expect(within(dialog).getByRole('option', { name: /Chainlink/ })).toHaveAccessibleName(
      /market cap \$8\.9B · fully diluted valuation \$11\.9B/
    );
    expect(within(dialog).getByRole('status')).toHaveTextContent('3 tokens on Ethereum');
    expect(search()).toHaveFocus();
  });

  it('filters by name or symbol and shows an empty state', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await screen.findAllByRole('option');

    await user.type(search(), 'link');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Chainlink/ })).toBeInTheDocument();

    await user.clear(search());
    await user.type(search(), 'tether');
    expect(screen.getByRole('option', { name: /Tether USD/ })).toBeInTheDocument();

    await user.clear(search());
    await user.type(search(), 'doge');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText('No tokens match “doge” on Ethereum')).toBeInTheDocument();
  });

  it('selects a token on click and closes', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);

    await user.click(await screen.findByRole('option', { name: /USDC/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receive USDC on Ethereum' })).toBeInTheDocument();
  });

  it('supports arrow-key navigation and Enter to select', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await screen.findAllByRole('option');

    expect(screen.getByRole('option', { name: /Tether USD/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.keyboard('{ArrowDown}{ArrowDown}');
    const link = screen.getByRole('option', { name: /Chainlink/ });
    expect(link).toHaveAttribute('aria-selected', 'true');
    expect(search()).toHaveAttribute('aria-activedescendant', link.id);

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receive LINK on Ethereum' })).toBeInTheDocument();
  });

  it('loads the next page when scrolled near the end, without duplicates', async () => {
    const fetchSpy = mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await screen.findAllByRole('option');
    expect(screen.queryByRole('option', { name: /Dai Stablecoin/ })).not.toBeInTheDocument();

    const scroller = screen.getByRole('listbox', { name: 'Tokens' }).parentElement as HTMLElement;
    // Scrolling back up (e.g. the reset on a new search query) must not load more.
    fireEvent.scroll(scroller, { target: { scrollTop: 0 } });
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('page%5Bafter%5D'),
      expect.anything()
    );

    fireEvent.scroll(scroller, { target: { scrollTop: 500 } });

    expect(await screen.findByRole('option', { name: /Dai Stablecoin/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /Tether USD/ })).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('page%5Bafter%5D=cursor-2'),
      expect.anything()
    );
  });

  it('closes without selecting via the close button', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receive Select token' })).toBeInTheDocument();
  });

  it('shows an error state and recovers on retry', async () => {
    mockApi(json({ errors: [] }, 500));
    const user = renderWithQuery(<App />);
    await openSelector(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load tokens.');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('option', { name: /Tether USD/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('TokenSelectorDialog network tabs', () => {
  it('lists tradable networks, popular first, with Ethereum selected by default', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);

    const group = await screen.findByRole('radiogroup', { name: 'Network' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual([
      'Ethereum',
      'Base',
      'Arbitrum',
      'Avalanche',
    ]);
    expect(within(group).getByRole('radio', { name: 'Ethereum' })).toBeChecked();
  });

  it('loads the selected network’s tokens and keeps the search query', async () => {
    const fetchSpy = mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await screen.findAllByRole('option');
    await user.type(search(), 'ava');

    await user.click(screen.getByRole('radio', { name: 'Avalanche' }));

    expect(screen.getByRole('radio', { name: 'Avalanche' })).toBeChecked();
    expect(search()).toHaveValue('ava');
    const avax = await screen.findByRole('option', { name: /Avalanche/ });
    expect(
      within(avax).getByRole('img', { name: 'Native Avalanche token, used for gas' })
    ).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('filter%5Bimplementation_chain_id%5D=avalanche'),
      expect.anything()
    );
  });

  it('switches networks with arrow keys', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    const ethereum = await screen.findByRole('radio', { name: 'Ethereum' });
    await user.click(ethereum);

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Base' })).toBeChecked();
    expect(await screen.findByText('No tokens available on Base')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Avalanche' })).toBeChecked();
  });

  it('returns the network with the token and reopens on it', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await user.click(await screen.findByRole('radio', { name: 'Avalanche' }));

    await user.click(await screen.findByRole('option', { name: /Tether USD/ }));
    expect(screen.getByRole('button', { name: 'Receive USDT on Avalanche' })).toBeInTheDocument();

    await openSelector(user);
    expect(screen.getByRole('radio', { name: 'Avalanche' })).toBeChecked();
  });

  it('browses all networks, picks one outside the chips and returns to its tokens', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    expect(await screen.findByRole('radio', { name: 'Ethereum' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Blast' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Browse all networks' }));

    expect(screen.getByRole('dialog', { name: 'Networks' })).toBeInTheDocument();
    const networkSearch = screen.getByRole('combobox', { name: 'Search networks' });
    expect(networkSearch).toHaveFocus();
    // Current network first, then alphabetical.
    const names = () => screen.getAllByRole('option').map((o) => o.textContent);
    expect(names()).toEqual([
      'Ethereum, current network',
      'Arbitrum',
      'Avalanche',
      'Base',
      'Blast',
    ]);
    expect(screen.getByRole('option', { name: 'Ethereum, current network' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent('5 networks');

    // Prefix matches outrank mid-word ones.
    await user.type(networkSearch, 'b');
    expect(names()).toEqual(['Base', 'Blast', 'Arbitrum']);

    await user.type(networkSearch, 'la');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog', { name: 'Receive' })).toBeInTheDocument();
    expect(search()).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Blast' })).toBeChecked();
    expect(await screen.findByRole('option', { name: /BLAST/ })).toBeInTheDocument();
  });

  it('goes back from the networks view with Esc or the back button, keeping the selection', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await user.click(await screen.findByRole('button', { name: 'Browse all networks' }));

    // jsdom's <dialog> has no Esc handling; Esc makes the browser fire a cancelable `cancel`.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('dialog', { name: 'Receive' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Browse all networks' }));
    await user.click(screen.getByRole('button', { name: 'Back to tokens' }));
    expect(screen.getByRole('dialog', { name: 'Receive' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ethereum' })).toBeChecked();
  });
});

describe('TokenSelectorDialog accessibility', () => {
  it('exposes each option’s position in the full, virtualized list', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);

    const link = await screen.findByRole('option', { name: /Chainlink/ });
    expect(link).toHaveAttribute('aria-posinset', '3');
    expect(link).toHaveAttribute('aria-setsize', '3');
  });

  it('has one Tab stop per control: search, network group, browse, close', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    await screen.findAllByRole('option');
    expect(search()).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Ethereum' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Browse all networks' })).toHaveFocus();
    // Back from the search box: Close is the only control before it.
    await user.click(search());
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('shows the browse tooltip on hover and dismisses it with Esc without closing', async () => {
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    const browse = await screen.findByRole('button', { name: 'Browse all networks' });

    await user.hover(browse);
    expect(within(browse).getByText('Browse all networks')).toBeVisible();

    await user.keyboard('{Escape}');
    expect(within(browse).queryByText('Browse all networks')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Receive' })).toBeInTheDocument();
  });
});

describe('TokenSelectorDialog on mobile (bottom sheet)', () => {
  /** jsdom has no matchMedia; emulate a phone: sheet layout below 640px and/or a touch pointer. */
  function emulatePhone({ coarse = true } = {}) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('max-width') || (coarse && query.includes('coarse')),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('focuses the title instead of the search box, so the keyboard doesn’t cover the sheet', async () => {
    emulatePhone();
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);

    expect(screen.getByRole('heading', { name: 'Receive' })).toHaveFocus();
    expect(search()).not.toHaveFocus();
  });

  it('closes when the sheet is swiped down by its header', async () => {
    emulatePhone();
    mockApi();
    const user = renderWithQuery(<App />);
    await openSelector(user);
    const header = screen.getByRole('heading', { name: 'Receive' });

    await user.pointer([
      { keys: '[TouchA>]', target: header, coords: { clientY: 100 } },
      { pointerName: 'TouchA', target: header, coords: { clientY: 500 } },
      { keys: '[/TouchA]', target: header, coords: { clientY: 500 } },
    ]);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receive Select token' })).toBeInTheDocument();
  });

  it('snaps back after a short, slow drag', async () => {
    emulatePhone();
    mockApi();
    const user = renderWithQuery(<App />);
    const dialog = await openSelector(user);
    const header = screen.getByRole('heading', { name: 'Receive' });

    await user.pointer([
      { keys: '[TouchA>]', target: header, coords: { clientY: 100 } },
      { pointerName: 'TouchA', target: header, coords: { clientY: 150 } },
    ]);
    expect(dialog.style.translate).toBe('0 50px');
    // Slow enough not to count as a flick.
    await new Promise((resolve) => setTimeout(resolve, 150));
    await user.pointer({ keys: '[/TouchA]', target: header, coords: { clientY: 150 } });

    expect(screen.getByRole('dialog', { name: 'Receive' })).toBeInTheDocument();
    expect(dialog.style.translate).toBe('');
  });
});
