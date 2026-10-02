# zerion-receive-token-selector

A reproduction of the **Receive** token selector from [Zerion Swap](https://app.zerion.io/swap), built on the [Zerion API](https://developers.zerion.io).

- Live tokens from `GET /v1/fungibles`, filtered by network server-side, loaded 100 at a time on scroll (React Query infinite query, virtualized with `@tanstack/react-virtual`)
- Instant client-side search by name or symbol
- Network chips from `GET /v1/chains` plus a "Browse all networks" view with ranked search
- Token rows with icon, network badge, verified / native-gas markers, market cap, FDV, price and 24h change
- Loading skeletons, error + retry, empty states
- Centered modal on desktop; bottom sheet with swipe-to-close below 640px
- Accessible: native `<dialog>`, combobox + listbox keyboard model, radio-group network chips, live-region announcements, WCAG 2.2 AA contrast

## Getting started

Requires Node 22 (`nvm use`).

```bash
npm install
cp .env.example .env.local   # then set ZERION_API_KEY
npm run dev                  # http://localhost:3000
```

The API key is read only by the Vite dev/preview server, which proxies `/api/zerion/*` to `api.zerion.io` and adds the auth header — it never ships in the client bundle.

## Deploying to Netlify

`netlify.toml` builds with `npm run build` and publishes `dist`; Node comes from `.nvmrc`. In production the proxy is the edge function `netlify/edge-functions/zerion-proxy.ts`. It only forwards `GET /v1/fungibles/` and `GET /v1/chains/` (so it can't be used as an open proxy on your key) and lets Netlify's CDN cache responses for 60s to save the daily quota.

Add the key under **Site configuration → Environment variables**:

- Key: `ZERION_API_KEY`. No `VITE_` prefix: that would bake it into the public bundle.
- Scope: **Functions** only. The build doesn't need it.
- Tick **Contains secret values**, so Netlify masks it in logs and fails a deploy if it ever leaks into the build output.

Then redeploy. The edge function reads env vars at request time.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm test` / `npm run test:run` | Vitest in watch mode / single run |
| `npm run lint` / `npm run lint:fix` | Biome lint + format |
| `npm run typecheck` | TypeScript, no emit |
| `npm run build` | Production build |

## Where things live

```
src/
  App.tsx                         Swap-style "Receive" field that opens the selector
  components/token-selector/
    TokenSelectorDialog.tsx       Dialog shell, token view, close/animation lifecycle
    ChainTabs.tsx                 Network chips + "Browse all networks" button
    NetworkList.tsx               Browse-all-networks view
    TokenRow.tsx, TokenIcon.tsx   List row and icons
    useFungibles.ts, useChains.ts Zerion API queries
    useListNavigation.ts          Combobox keyboard navigation
    useSwipeToDismiss.ts          Bottom-sheet drag to close
  lib/http.ts                     HttpError + retry policy
```
