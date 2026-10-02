# Zerion Receive Token Selector

Single-page React app used as a sandbox for a live-coding task: build a complex UI component.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind v4 · Vitest + Testing Library · Biome · lucide-react

Data: `@tanstack/react-query` (`QueryClientProvider` + retry policy in `main.tsx`), `@tanstack/react-virtual` for long lists.

## Commands

Node 22 (`nvm use`).

- `npm run dev` — dev server on http://localhost:3000
- `npm test` — Vitest watch mode; `npm run test:run` — single run
- `npm run lint` / `npm run lint:fix` — Biome lint + format
- `npm run typecheck`
- `npm run build`

Zerion API: put `ZERION_API_KEY` in `.env.local` (see `.env.example`). The Vite dev/preview proxy at `/api/zerion` adds the auth header, so the key never reaches the client bundle — never expose it via a `VITE_` variable.

## Layout

- `src/App.tsx` — the single entry page; mount the component under development here
- `src/components/<name>/` — component, its sub-parts, hooks, and `*.test.tsx` co-located
- `src/lib/cn.ts` — `cn()` = clsx + tailwind-merge for conditional classes
- `src/index.css` — Tailwind theme tokens (`bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, …)
- `src/test/setup.ts` — jest-dom matchers, ResizeObserver / scrollIntoView stubs

Import via the `@/` alias (`@/lib/cn`).

## Conventions

- Named exports, function components, no default exports.
- Style with Tailwind utilities and theme tokens; no hard-coded hex values in components.
- Accessibility first: semantic elements, labelled controls, full keyboard support, visible focus.
- Keep state as local as possible; derive instead of syncing; extract a hook once logic is non-trivial.
- Test behavior through the user's perspective (`getByRole`, `userEvent`), not implementation details.
- Run `npm run lint:fix && npm run typecheck && npm run test:run` before calling a change done.
