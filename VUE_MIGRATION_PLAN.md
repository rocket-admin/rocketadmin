# Plan: Migrate RocketAdmin frontend from Angular to Vue.js

## Context

The RocketAdmin frontend (`frontend/`) is an **Angular 20** single-page app. It uses standalone components, Angular Material (M2 theming) and Vitest. The goal is to rebuild it in **Vue 3** with no change in features, routes, API contract or deployment shape, so users don't notice the switch. This plan covers the target stack, the order of work and how to check that the Vue app matches the Angular one.

**Current size** (from exploring the codebase):
- 250 components, 27 services, 4 guards, 2 interceptors and 9 validator directives.
- About 47k lines of TypeScript, 13k lines of HTML and 22k lines of CSS.
- 258 spec files and 159 Storybook stories.
- **Angular Material is everywhere:** 1,734 `<mat-*>` tags, 47 dialog components and 76 files that use the snackbar.
- **Field widgets:** about 119 components in 4 families (`record-edit-fields`, `record-view-fields`, `table-display-fields`, `filter-fields`, each with 23–32 types). They are rendered dynamically through `ng-dynamic-component` and the type maps in `src/app/consts/*-types.ts`.
- **Forms are mostly template-driven:** 617 `ngModel` uses, 12 reactive forms and 8 custom validator directives.
- **State uses two patterns:** legacy BehaviorSubject event-bus services (`connections`, `tables`, `user`, `auth`, `company`, ...) and newer signal/`rxResource` services (`dashboards`, `saved-queries`, `users`, `cedar-permission`, ...).
- **Heavy third-party libraries:** Monaco (via `@ngstack/code-editor`, 10 places), Chart.js (via ng2-charts), angular-gridster2, ngx-markdown with mermaid, Cedar wasm, Sentry, PostHog, angulartics2/amplitude and Turnstile.
- **Auth uses an httpOnly cookie.** The client only keeps `localStorage.token_expiration`. `token.interceptor.ts` adds the base URL, `withCredentials`, the `GCLID` and `masterpwd` headers, and redirects to `/login` on a 401.
- **Deployment:** the root `Dockerfile` builds the frontend (`production` or `saas-production`), copies `dist/rocketadmin/browser` to `/var/www/html`, and nginx serves it with the SPA fallback and the `/api` proxy.

## Recommended approach

**A parallel rewrite in a new `frontend-vue/` directory**, built feature by feature. The Angular app stays in production until the Vue app reaches feature parity. Then the switch happens in the Dockerfile in one step, and Angular can be switched back on in the same step if needed.

Why I'm not recommending a gradual, route-by-route hybrid: the app shell, sidenav, dialogs and theme are shared by every page. Mixing Angular and Vue on the same pages (micro-frontends, or web components through `defineCustomElement`) would mean keeping two runtimes and two theming systems in sync. That costs more than a clean parallel build.

### Target stack

| Concern | Angular today | Vue target |
|---|---|---|
| Framework | Angular 20 standalone | **Vue 3.5+**, `<script setup lang="ts">`, Composition API |
| Build | `@angular/build:application` | **Vite**; `vue-tsc` for type checking |
| Routing | Angular Router, `loadComponent`, guards | **vue-router 4**: lazy `() => import()` routes and `beforeEach` guards based on route `meta` |
| State | BehaviorSubject and signal services | **Pinia** stores (setup syntax). Signals map to `ref`/`computed`; `rxResource`/`httpResource` map to **TanStack Vue Query** |
| HTTP | HttpClient, interceptors, `api.service.ts` (fetch) | One `fetch` wrapper (`src/api/client.ts`) that ports the interceptor logic and the NDJSON streaming |
| UI kit | Angular Material and CDK | **Vuetify 3** (Material Design, so its components match `mat-*` most closely) |
| Theming | ngx-theme runtime palettes, `--color-*` variables | Generate the same `--color-<palette>-<shade>` variables from the same `colorConfig` (ported to `src/theme/palettes.ts`), and map them into the Vuetify theme. Dark mode follows `prefers-color-scheme` |
| Forms | `ngModel` plus validator directives | `v-model`, Vuetify `:rules`, and the validators ported as pure functions in `src/validators/` |
| Dynamic widgets | `ndc-dynamic` | `<component :is="map[type]" v-bind="inputs" v-on="outputs">` |
| Code editor | `@ngstack/code-editor` | **`@guolao/vue-monaco-editor`**, or a thin wrapper around `monaco-editor`; the Cedar language in `lib/cedar-monaco-language.ts` is reused as is |
| Charts | ng2-charts | **vue-chartjs**; `lib/chart-config.helper.ts` is reused |
| Dashboard grid | angular-gridster2 | **grid-layout-plus** |
| Markdown / mermaid | ngx-markdown | `marked` with `mermaid` in a `<MarkdownView>` component |
| Clipboard / drag-drop | CDK | `@vueuse/core` (`useClipboard`) and `vuedraggable` (SortableJS) |
| Error tracking / analytics | `@sentry/angular`, angulartics2, posthog | `@sentry/vue`, a small `useAnalytics()` composable around posthog/amplitude, and the router `afterEach` for page views |
| Password meter | angular-password-strength-meter | `@zxcvbn-ts/core` with a small `<PasswordStrength>` component |
| Unit tests | Vitest + TestBed | **Vitest + @vue/test-utils** (the same runner) |
| Stories | Storybook 10 Angular | Storybook 10 `@storybook/vue3-vite` |
| Lint / format | TSLint (deprecated), biome | biome plus `eslint-plugin-vue` |

### Code that carries over unchanged (framework-agnostic TypeScript)
Copy these as-is and add tests where they are missing:
- `src/app/models/`
- `src/app/consts/`, except the component references in the `*-types.ts` maps, which are rebuilt as Vue component maps
- `src/app/lib/`: Cedar parser and policy logic, chart config helper, field formatting, filter param parsing
- `src/app/validators/`: the logic only, without the directive wrappers
- The service logic in `tables.service.ts`, `connections.service.ts` and others. Pull the HTTP calls into `src/api/*.ts` modules first so the stores stay thin.
- `src/environments/*`, which become Vite `.env.*` files and modes (see Phase 0)
- Assets, fonts, `index.saas.html` scripts (Intercom, gtag, GSI) and the cedar wasm

## Phases

### Phase 0 – Scaffolding and infrastructure
1. Create `frontend-vue/` with Vite, Vue 3, TypeScript, Pinia, vue-router, Vuetify, TanStack Query and Vitest.
2. **Environments:** use Vite modes `development`, `production`, `saas` and `saas-production`, with `.env.*` files that hold the same fields (`VITE_SAAS`, `VITE_API_ROOT`, `VITE_SAAS_URL`, `VITE_SAAS_HOSTNAMES`, `VITE_STAGING_HOST`, `VITE_TURNSTILE_SITE_KEY`). Choose the SaaS `index.html` with a small Vite plugin (`transformIndexHtml`), or with two HTML entry points.
3. **Runtime `config.json` loader:** port `ConfigModule.buildForConfigUrl` so `baseURL` is read before the app mounts.
4. **Dev proxy:** port `src/proxy.conf.json` to `server.proxy` in Vite (`/api` → `https://app.rocketadmin.com/api/`).
5. **Version:** port `scripts/update-version.js` so it writes `src/version.ts`.
6. **Monaco:** set up local workers and assets (`vite-plugin-monaco-editor`, or `?worker` imports) to replace the `assets/monaco` copy. Copy the cedar wasm to `public/`.
7. **CI:** run lint, `vue-tsc` and Vitest for `frontend-vue/` next to the Angular jobs.

### Phase 1 – Foundations
1. **API client** (`src/api/client.ts`), porting `token.interceptor.ts`, `url-params.interceptor.ts` and `api.service.ts`:
   - Prefix the base URL; send `/saas` URLs to `saasURL`.
   - Send credentials (`credentials: 'include'`) on every API request.
   - Add the `GCLID` header from the `autoadmin_gclid` cookie and the `masterpwd` header from `localStorage[${connectionID}__masterKey]`.
   - Encode query params with `encodeURIComponent`.
   - On a 401, clear `token_expiration` and redirect to `/login`.
   - Show errors through the notifications store.
   - Support NDJSON streaming.
2. **Auth and guards:** an `auth` store, plus router guards (`requiresAuth`, `guestOnly`, `configuration`, `setup`) that reproduce the `token_expiration` check and the self-hosted setup redirect.
3. **Theme:** port the `colorConfig` from `src/main.ts` into a palette generator that writes the same `--color-*` CSS variables. Port the global `custom-theme.scss` and `styles.scss`. Recreate the `--mat-*` overrides as Vuetify defaults and variables.
4. **App shell:** port `app.component` (toolbar, sidenav, user menu, banners), route titles (`meta.title` through `afterEach`), the 404 page, and Sentry/analytics setup (SaaS mode only).
5. **Shared UI primitives** that replace Material patterns used everywhere:
   - **`useDialog()`:** a programmatic dialog service that keeps the `dialog.open(Component, { data })` → `afterClosed()` promise shape. This keeps the 47 dialogs mechanical to port.
   - **`useNotify()`:** replaces the snackbar.
   - **`<AppDialogForm>`:** follows the CLAUDE.md rule that a dialog with a form wraps its content and actions in a form, with a submit-type primary button.
   - Ports of alert, banner, breadcrumbs, content-loader, the skeletons (17) and icon-picker. Icons use `material-symbols-outlined`.
6. **Port all services to Pinia stores and composables.** Replace the string-event BehaviorSubjects (for example `tables.cast` emitting `'delete row'`) with explicit store actions and state, or with a typed event bus (`mitt`) where it really is fire-and-forget. List every `cast` consumer before removing it.

### Phase 2 – The field widget system (the core of the app)
1. Port the `base-*` classes as composables (`useRecordEditField(props, emit)`, and so on) with a shared props contract (`label`, `value`, `structure`, `widgetStructure`, `relations`, `readonly`, `required`, `disabled`).
2. Port the widgets one family at a time, as a mechanical template-to-SFC conversion:
   - `record-view-fields` (32), `table-display-fields` (32), `record-edit-fields` (32), `filter-fields` (23)
   - Include foreign-key autocomplete, S3/file/image upload, the Monaco-based code, json and markdown fields, and country/phone (`libphonenumber-js`).
3. Rebuild `consts/record-edit-types.ts`, `record-view-types.ts`, `table-display-types.ts` and `filter-types.ts` as maps from type to `defineAsyncComponent`. Keep the DB-type mapping tables exactly as they are.
4. Write a Storybook story for each widget, ported from the existing 159 stories, so each one can be compared visually with the Angular version.

### Phase 3 – Features (each one should ship complete; this is the recommended order)
1. **Auth flows:** login (with Google GSI and Turnstile), setup, forget-password, password-reset/change, email verify/change, company invitation, deleted account.
2. **Connections:** `connections-list`, `connect-db` (16 components), `edit-db`, `connection-settings`, `auto-configure`.
3. **Table browser** (`components/dashboard/`, the hardest part):
   - `db-tables-list` (630 lines) and `db-table-view` (1,103 + 752 lines). Use Vuetify `v-data-table-server` for paging, sorting and selection, and sync the query state with the URL (replaces `ngmat-table-query-reflector`).
   - Filters dialog, saved-filters panel, export/import, row view/edit (`db-table-row-edit`, 871 lines), and the actions, widgets and settings pages.
   - The AI panel, with NDJSON streaming and markdown/mermaid rendering.
4. **Users and permissions:** groups, permissions, the Cedar policy editor (Monaco plus wasm), view-as.
5. **Saved queries / charts:** chart-edit (716 lines, SQL editor) and chart-preview.
6. **Dashboards:** the grid-layout-plus dashboard view and the chart, counter, table and text panels.
7. **Remaining pages:** company, user-settings, api-keys, secrets, audit, zapier, edit-database-schema (mermaid diagram).
8. **Redirects:** the legacy routes (`hosted-databases`, `saml`, `demo`, `upgrade*`, `subscription/success`) and the `**` 404 route.

### Phase 4 – Parity, cutover and cleanup
1. **Parity checklist:** every route in `app-routing.module.ts` has a matching route in Vue, with the same paths and query params, so existing bookmarks and emailed links keep working.
2. **Dockerfile:** change the `front_builder` stage to build `frontend-vue` (`vite build --mode saas-production|production`) and copy its `dist/` to `/var/www/html`. `frontend/nginx/default.conf` does not change. During the trial period, use a build arg (`FRONTEND=angular|vue`) so switching back is one parameter.
3. **Rollout:** staging first, then SaaS production, then self-hosted images.
4. **Cleanup:** after one stable release, delete `frontend/`, rename `frontend-vue/` to `frontend/`, delete the stale `frontend/Dockerfile`, and update `CLAUDE.md` and `frontend/CLAUDE.md` with the Vue conventions (`<script setup>`, Pinia setup stores, composables, palette-only colors, BEM).

## Rules for the rewrite
- **No feature changes during the port.** File UI or UX improvements as separate follow-ups so the parity review stays meaningful.
- **Freeze new features in Angular** once Phase 3 starts, or require each new Angular feature to be ported to Vue in the same PR.
- **Colors** only through the `--color-*` palette variables (the same rule as today).
- **Tests:** port the useful specs, focused on behavior (stores, API client, guards, validators, widgets), with `@vue/test-utils`, using `Partial<Store>` mocks and no `as any`.

## Risks
- **Matching Material's look in Vuetify:** form-field density and the dialog and snackbar look will differ slightly. Settle the look in Phase 1 against Storybook before porting 250 components.
- **`db-table-view` and `db-table-row-edit`** hold the most logic. Pull their logic into composables first, and test that logic before porting the templates.
- **The string-based event bus** in legacy services can hide coupling between components. Map every consumer before replacing it.
- **Monaco workers and the Cedar wasm under Vite** must be checked early, in Phase 0.
- **Scale:** about 250 components. Assume several months for a small team. Phases 2–3 can run in parallel by feature once Phase 1 is done.

## Verification
- **Per PR:** `vue-tsc --noEmit`, biome/eslint, and `vitest run` (unit and component tests) in `frontend-vue/`.
- **Widgets:** compare each widget's Storybook story side by side with the Angular one.
- **Feature parity:** run both apps against the same backend: `just` or Docker with the test DBs from `docker-compose.tst.yml`, Angular `yarn start` and Vue `pnpm dev`, both proxying `/api`. Walk the parity checklist for each database type (MySQL, Postgres, MongoDB, ...). Cover CRUD on rows, every widget type, filters, export/import, permissions, dashboards, saved queries, the AI panel and the auth flows.
- **E2E (new; there is none today):** add a Playwright smoke suite covering login, opening a connection, browsing a table, editing a row, applying a filter and opening a dashboard. Run it against the Angular app first to set the baseline, then against Vue. The same suite then protects the cutover.
- **Build:** `docker build` with the Vue frontend (both `SAAS` and non-SaaS). Check that nginx serves the SPA fallback, the `/api` proxy and streaming work, and Sentry/PostHog/Intercom load only in SaaS builds.
