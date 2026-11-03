# frontend/CLAUDE.md

Guidance for working in the RocketAdmin web app: Vue 3, Vite, Pinia, vue-router 4, TanStack Vue Query, Vitest, Storybook. It is installed with **pnpm**, on its own, not as a member of the root workspace. `README.md` lists the commands and the main mechanisms.

## Commands

```bash
pnpm install
pnpm dev              # mode `development`, proxies /api to app.rocketadmin.com
pnpm dev:saas         # mode `saas`
pnpm build            # self-hosted (`production`)
pnpm build:saas       # SaaS (`saas-production`, index.saas.html)
pnpm lint             # biome + eslint-plugin-vue
pnpm typecheck        # vue-tsc
pnpm test:ci          # vitest run
pnpm test:e2e         # Playwright against a production build and a mocked API
pnpm storybook        # :6006
```

Before you finish a change, run `pnpm lint`, `pnpm typecheck` and `pnpm test:ci`.

## Layout

- `src/views/<area>/` holds the routed pages (`*View.vue`). `src/components/<area>/` holds their parts.
- `src/components/ui/` holds the design-system primitives (`Ui*`). Read `src/components/ui/CONVENTIONS.md` before you add or change one.
- `src/components/fields/` holds the field widgets (record-edit, record-view, table-display, filter). `src/consts/*-types.ts` map each DB type to a widget with `defineAsyncComponent`.
- `src/stores/` holds the Pinia stores. `src/composables/` holds the `use*` composables.
- `src/api/client.ts` is the only HTTP entry point: base URL, credentials, the GCLID/masterpwd headers, 401 handling, error notifications and NDJSON streams.
- `src/models/`, `src/lib/` and `src/validators/` hold framework-free TypeScript. Validators are pure functions.
- `src/router/routes.ts` keeps the paths of the old Angular app. Guards come from route `meta`. `routes.spec.ts` checks the routes against an Angular snapshot.
- `public/assets/` holds static images and icons, served at `/assets`. `nginx/default.conf` is the production nginx config, which the root `Dockerfile` copies into the image.

## Conventions

- **Components:** `<script setup lang="ts">` with the Composition API. Use `withDefaults(defineProps<…>(), …)` and typed `defineEmits`.
- **State:** Pinia **setup stores** (`defineStore('x', () => { … })`) built from `ref` and `computed`. Server data that is fetched and cached goes through TanStack Vue Query (`src/api/query-options.ts`).
- **Reuse logic through composables**, not mixins or base classes. Keep heavy page logic in a composable with its own spec (see `useRowEdit`, `useTableData`).
- **Dialogs and snackbars:** `useDialog().open(Component, { data }).afterClosed()` and `useNotify()`. Dialogs with inputs use `AppDialogForm`.
- **Styling:** scoped plain CSS with BEM class names. Colours come only from the semantic `--color-*` variables in `src/assets/theme.css`, never `--palette-*` or hex. Spacing, size and radius use the token scale. `src/__tests__/design-tokens.spec.ts` fails on hex colours and raw `font-size`/`gap`/`padding` values. The dark theme swaps the same semantic variables, so components need no dark-specific CSS.
- **Table links** go through `tablePagePath()` (`src/lib/table-url.ts`), which encodes table names the way the old Angular router did.
- **Tests:** Vitest with `@vue/test-utils`, in a `*.spec.ts` file next to the code. Test behaviour: stores, the API client, guards, validators and widgets. Mock stores as typed `Partial<…>` objects, never with `as any`. Write Storybook stories (`*.stories.ts`) for UI primitives and widgets.
- **Analytics and monitoring:** `src/lib/monitoring.ts` sets up Sentry (SaaS builds only), PostHog (SaaS production only) and Amplitude. Report events through `useAnalytics()` or the area's `analytics.ts`.

## Build and deploy

The root `Dockerfile` builds this app (`pnpm build` or `pnpm build:saas` when `SAAS` is set) and copies `dist/` to `/var/www/html`. Vite writes its hashed bundles to the `dist/` root (`build.assetsDir: ''`), the only place where nginx's immutable-cache rule applies. If you add a new kind of hashed output file, add its extension to that rule in `nginx/default.conf`.
