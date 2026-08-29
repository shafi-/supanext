# AGENTS.md

**Authoritative frontend architecture spec for this repository.** `CLAUDE.md` references
this file; do not duplicate or diverge from the contract below. When the frontend layering
changes, update it HERE only.

## Enforced Layering

```
Page (thin)  →  Container (backend + state; calls Services, renders Components)
                │
                ├── calls ────> Service → Repository → Supabase
                └── renders ──> Component (pure view, props in, no backend)
```

- **The Container owns the backend.** It calls Services (and/or data hooks) to fetch data
  and **renders** pure Components, passing that data down as props.
- **The Component is a leaf view.** It never calls a Service and never holds backend state.

## Contracts

### Page (`src/app/<route>/page.tsx`)
- Thin. Renders exactly one `Container` (wrap in `<Suspense>` if the container uses
  `useSearchParams` / `useRequiredParam`).
- NO data hooks, NO `useState`/`useEffect` for data, NO service calls, NO business logic.

### Container (`src/containers/<feature>/<Name>Container.tsx`)
- The ONLY layer that communicates with the backend.
- Calls services and/or data hooks (`useAuth`, `useSessionContext`, `useSubscription`,
  `useProfile`, `useSystemAdmin`, `useRequiredParam`, …) and owns local state
  (loading / error / form).
- Renders pure Components, passing data + callbacks as props.
- Reuse an existing container when features overlap (e.g. admin can reuse user containers).

### Component (`src/components/<feature>/<Name>.tsx`)
- PURE presentation. Receives data + callbacks as props.
- NO imports of `@/services` / `@/repositories`.
- NO data-fetching hooks (`useAuth`, `useSubscription`, `useSessionContext`, `useProfile`,
  `useSystemAdmin`, `useRequiredParam`, `useQueryParam`).
- Use `import type` (never a runtime import) for types from a service file.
- Local UI state (`useState`/`useEffect` for UI only) is fine.
- Reuse `ui/` primitives (`Button`, `Input`, `Loading`) and `shared/` components instead of
  raw elements/styles.

## Directory conventions
- `src/containers/<feature>/` — feature containers (mandatory layer).
- `src/components/<feature>/` — feature presentational components.
- `src/components/ui/` — design primitives (Button, Input, Loading).
- `src/components/shared/` — cross-feature shared components (e.g. `StatusBadge`).
- `src/services/`, `src/repositories/`, `src/hooks/`, `src/types/` — backend/state layers.

## Session context exception
`AuthProvider` / `SessionContextProvider` (root `app/layout.tsx`) hold session state and
expose it via hooks. `AppLayout` (the shell) may read those hooks and pass `user` /
`isSystemAdmin` down to `Nav` as props. `Nav` itself is pure. Do not add
backend/data-hook calls to other components.

## Adding a feature page
1. `app/<route>/page.tsx` — thin; render `<XContainer />`.
2. `src/containers/<feature>/XContainer.tsx` — backend + state, renders components.
3. `src/components/<feature>/*` — pure views receiving props + callbacks.
4. Prefer reusing an existing container/component over duplicating.
