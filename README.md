# zerion-receive-token-selector

[![Netlify Status](https://api.netlify.com/api/v1/badges/0355755e-8bc9-4a8d-ac5f-aa2ea7e5e9e0/deploy-status)](https://app.netlify.com/projects/zerion-receive-token-selector/deploys)

**Live demo:** https://zerion-receive-token-selector.netlify.app/

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
