# frontend-vue

Vue 3 rewrite of the RocketAdmin frontend (see `../VUE_MIGRATION_PLAN.md`). The Angular app in `../frontend` stays in production until this one reaches parity.

Stack: Vite, Vue 3 (`<script setup lang="ts">`), Pinia, vue-router 4, Vuetify 3, TanStack Vue Query, Vitest.

```bash
pnpm install
pnpm dev            # dev server, mode `development`, proxies /api to app.rocketadmin.com
pnpm dev:saas       # dev server, mode `saas`
pnpm build          # mode `production` (self-hosted)
pnpm build:saas     # mode `saas-production` (uses index.saas.html)
pnpm lint           # biome + eslint-plugin-vue
pnpm typecheck      # vue-tsc
pnpm test:ci        # vitest
```

- **Modes / environments:** `.env.<mode>` files mirror `frontend/src/environments/*.ts`; `src/environment.ts` exposes them with the same shape.
- **Runtime config:** `public/config.json` is fetched before the app mounts (`src/config.ts`).
- **Version:** `scripts/update-version.js` writes `package.json`'s version to `src/version.ts`.
- **Assets:** served from `../frontend/src/assets` at `/assets` until the cutover, when they move here.
- **Monaco / Cedar:** `src/lib/monaco.ts` and `src/lib/cedar-wasm.ts` load them lazily; Vite bundles the Monaco workers and the Cedar wasm.
