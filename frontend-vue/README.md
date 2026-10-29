# frontend-vue

Vue 3 rewrite of the RocketAdmin frontend (see `../VUE_MIGRATION_PLAN.md`). The Angular app in `../frontend` stays in production until this one reaches parity.

Stack: Vite, Vue 3 (`<script setup lang="ts">`), Pinia, vue-router 4, TanStack Vue Query, Vitest, Storybook. UI: the design system copied from SiteNova (`src/assets/theme.css`, `src/components/ui/`), no component library.

```bash
pnpm install
pnpm dev            # dev server, mode `development`, proxies /api to app.rocketadmin.com
pnpm dev:saas       # dev server, mode `saas`
pnpm build          # mode `production` (self-hosted)
pnpm build:saas     # mode `saas-production` (uses index.saas.html)
pnpm lint           # biome + eslint-plugin-vue
pnpm typecheck      # vue-tsc
pnpm test:ci        # vitest
pnpm test:e2e       # Playwright, against a production build and a mocked API
pnpm storybook      # design system docs and component stories on :6006
```

- **Modes / environments:** `.env.<mode>` files mirror `frontend/src/environments/*.ts`; `src/environment.ts` exposes them with the same shape.
- **Runtime config:** `public/config.json` is fetched before the app mounts (`src/config.ts`).
- **Version:** `scripts/update-version.js` writes `package.json`'s version to `src/version.ts`.
- **Assets:** served from `../frontend/src/assets` at `/assets` until the cutover, when they move here.
- **Monaco / Cedar:** `src/lib/monaco.ts` and `src/lib/cedar-wasm.ts` load them lazily; Vite bundles the Monaco workers and the Cedar wasm.
- **Design system:** copied from SiteNova (`sitenova/frontend`). Tokens in `src/assets/theme.css` (the `--palette-*` layer must stay in sync with SiteNova), primitives in `src/components/ui/` — read `src/components/ui/CONVENTIONS.md` before adding one. `src/__tests__/design-tokens.spec.ts` fails on hex colours and raw `font-size`/`gap`/`padding` values; `src/components/ui/__tests__/a11y.spec.ts` runs axe-core over every primitive.
- **HTTP:** every request goes through `src/api/client.ts` (base URL, credentials, GCLID/masterpwd headers, 401 handling, error notifications, NDJSON streams). A failed request is shown to the user and then thrown as a `notified` `ApiError`, which `main.ts` keeps out of the console.
- **Dialogs and snackbars:** `useDialog().open(Component, { data }).afterClosed()` and `useNotify()`; dialogs with inputs use `AppDialogForm`.
- **End-to-end tests:** `e2e/*.e2e.ts` drive the self-hosted production build in Chromium. No backend is needed: `e2e/support/mock-backend.ts` answers every `/api` request from in-memory state seeded by `e2e/support/fixtures.ts`, so created and deleted records show up as they would against the real API. A test fails on any request the mock doesn't know and on any uncaught page error. Use `backend.override()` to make one endpoint fail and `backend.callsTo()` to check what was sent. First run: `pnpm exec playwright install chromium`.
- **Routes:** `src/router/routes.ts` has every Angular route with the same paths; guards come from route `meta` (`requiresAuth`, `guestOnly`, `configuration`, `setup`). Every route maps to its page in the `views` table there (`page()` throws if a route has none).
