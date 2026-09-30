# Upravnik Platform: Nx Monorepo Migration Plan

Merge `upravnik-platform-frontend` (Next.js) into `upravnik-platform` (NestJS) as a single **Nx** monorepo. Git history from both repos is preserved.

## 0. Current state (audited)

| | Backend (`C:\My Web Projects\upravnik-platform`) | Frontend (`C:\My Web Projects\upravnik-platform-frontend`) |
|---|---|---|
| Remote | `Valuh-Marko/upravnik-platform` | `Valuh-Marko/upravnik-platform-frontend` |
| Stack | NestJS 11, Prisma 7 (`@prisma/adapter-pg`), Jest 30 + ts-jest, Socket.IO, Passport/JWT | Next.js 16.2, React 19, Tailwind 4, shadcn, TanStack Query, axios |
| Package manager | npm (`package-lock.json`) | npm (`package-lock.json`) |
| TS module setup | `module`/`moduleResolution: nodenext`, decorators, `baseUrl: ./` | `moduleResolution: bundler`, `strict`, path alias `@/*` |
| Extra dirs | `prisma/`, `generated/prisma` (gitignored), `test/`, `docs/`, `postman/`, `.postman/`, `docker-compose.yml` | `app/`, `components/`, `hooks/`, `lib/`, `public/`, `docs/`, `postman/` |
| Root config | `eslint.config.mjs`, `.prettierrc`, `nest-cli.json`, `prisma.config.ts` | `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `components.json` |
| CI | none found | none found |
| Dev port | `process.env.PORT ?? 3000`, and `.env` sets no `PORT`, so **3000** | `next dev` default, so **3000** |
| Env | `.env`: `DATABASE_URL`, `JWT_SECRET` | none. `lib/axios.ts` reads `NEXT_PUBLIC_API_URL`, falling back to `http://localhost:3000/api` |
| Prisma client | `prisma-client-js` generator with **no `output`**, so it generates into `node_modules/.prisma/client`. Imported as `@prisma/client` (14 imports in `src/` and `prisma/`) | n/a |

Things to know before starting:
- The **BE `.gitignore` ignores `CLAUDE.md` and `upravnik-platform.md`**. The FE tracks its `CLAUDE.md`. Decide the policy up front (see 6.4).
- Both repos use **npm**, so staying on npm removes one variable. Nx works fine with npm workspaces.
- The two apps pin different `@types/node` versions (`^20` vs `^24`). Nx prefers a single version per dependency at the root, so this needs reconciling (see 4.2).
- Installed here: Node v24.16, npm 11.13. Not installed: `nx`, `pnpm`. Nx will be a local devDependency, so a global install isn't needed.
- The BE repo already has a pre-existing `ts-jest ^29` vs `jest ^30` mismatch. It's unrelated to the migration, but the root install may surface warnings.

---

## 1. Decisions (defaults proposed, change if you disagree)

1. **Host repo = the BE repo**, moved/renamed nowhere: `C:\My Web Projects\upravnik-platform`, remote `Valuh-Marko/upravnik-platform`. The FE gets merged into it, as you described. The FE GitHub repo is archived afterwards.
2. **Package manager: npm workspaces.** Single root `package-lock.json`. (Switching to pnpm later is possible but is a separate task.)
3. **Nx style: package-based with inferred targets** (Nx plugins read each app's config and infer `build`/`dev`/`lint`/`test`). Keep the existing `package.json` scripts and tool configs (`nest-cli.json`, `next.config.ts`). Avoid rewriting them into `project.json` executors. This is the smallest-diff route.
4. **Layout:**
   ```
   upravnik-platform/
     apps/
       backend/            <- NestJS (current BE contents)
       frontend/           <- Next.js (current FE contents)
     packages/             <- shared libs (empty at first, see phase 8)
     docs/                 <- cross-cutting docs (this plan, architecture)
     docker-compose.yml    <- infra (Postgres), shared by the whole repo
     nx.json
     package.json          <- root, workspaces, Nx devDeps
     tsconfig.base.json
     eslint.config.mjs     <- root base config
     .prettierrc
     .gitignore
     .gitattributes
     .nvmrc
     .github/workflows/ci.yml
     CLAUDE.md
     README.md
   ```
5. **Nx Cloud:** skip for now (`--nxCloud=skip`). Local caching is enough. Can be added later.

---

## 2. What to install

Prerequisites (machine level):
- Node 24 LTS (already there) and npm 11.
- Git, and Docker Desktop for Postgres.
- SSH access to GitHub (both remotes are SSH).
- Nothing global for Nx. Use `npx nx ...` or an npm script.

Root devDependencies (installed at the repo root, not in the apps):

| Package | Why |
|---|---|
| `nx` | Task runner, graph, caching, `affected` |
| `@nx/js` | TS/JS base plugin, `tsconfig.base.json` support |
| `@nx/next` | Infers Next `build`/`dev`/`start` targets, Next generators |
| `@nx/nest` | Optional. Only needed if you want Nest generators. Not needed to *run* the BE |
| `@nx/eslint` | Infers `lint` targets from each project's ESLint config |
| `@nx/jest` | Infers `test` targets from each project's Jest config |
| `@nx/workspace` | Not needed on modern Nx, skip |
| `prettier` | Moves to root, used by the whole repo (BE's copy is the only one today) |
| `typescript`, `eslint` | Hoisted single version at the root |

Command (run at the merged repo root, after phase 4):
```bash
npm install -D nx @nx/js @nx/next @nx/eslint @nx/jest
# optional: npm install -D @nx/nest
```
`npx nx@latest init` can add the plugins interactively. Whichever way, review the resulting `nx.json`.

Recommended editor extension: **Nx Console** (VS Code/JetBrains).

---

## 3. Safety net (do first)

1. Make sure both repos have **no uncommitted or unpushed work** (`git status`, `git push`).
2. Tag both current states:
   ```bash
   git -C "C:/My Web Projects/upravnik-platform" tag pre-monorepo
   git -C "C:/My Web Projects/upravnik-platform-frontend" tag pre-monorepo
   git -C ... push --tags
   ```
3. Copy both folders somewhere outside `C:\My Web Projects` as a physical backup (exclude `node_modules`).
4. Do all work on a **`monorepo` branch** in the BE repo. `main` stays untouched until the final merge.
5. Close editors, dev servers, and any process holding `node_modules`, `.next`, or `dist` open (common Windows file-lock problem).

---

## 4. Merging the repos (history preserved)

The trick: first move each repo's own files into their target subfolder *inside its own history*, then merge the two histories. The move commits leave no path collisions, so the merge has no conflicts. Git detects the moves as renames, so `git log --follow` and blame still work.

### 4.1 Move BE files into `apps/backend` (in the BE repo)

```bash
cd "/c/My Web Projects/upravnik-platform"
git checkout -b monorepo
rm -rf node_modules dist generated   # generated/prisma is gitignored and will be rebuilt
mkdir -p apps/backend
```
Then `git mv` **everything tracked** into `apps/backend/`. Keep at the root only what belongs to the whole repo. Move:
`src`, `test`, `prisma`, `prisma.config.ts`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `docs`, `postman`, `.postman`, `README.md`.

Stays at the root (moved later, phase 5): `docker-compose.yml`, `.gitignore`, `.prettierrc`, `.claude/`, `CLAUDE.md`.

The untracked `.env` is **not** moved by git. Move it by hand: `mv .env apps/backend/.env` (it's gitignored, so it won't leak).

```bash
git commit -m "chore: move backend into apps/backend"
```

### 4.2 Move FE files into `apps/frontend` (in a throwaway clone of the FE)

Do this in a *clone*, not in your working FE folder, so the original stays pristine:
```bash
cd "/c/My Web Projects"
git clone git@github.com:Valuh-Marko/upravnik-platform-frontend.git fe-migrate
cd fe-migrate
mkdir -p apps/frontend
# git mv everything tracked (app, components, hooks, lib, public, docs, postman,
# package.json, package-lock.json, tsconfig.json, next.config.ts, postcss.config.mjs,
# components.json, eslint.config.mjs, next-env.d.ts?, README.md, AGENTS.md, CLAUDE.md)
git commit -m "chore: move frontend into apps/frontend"
```
Notes:
- Working copy has untracked `.next`, `tsconfig.tsbuildinfo`, `node_modules`. The clone won't have them, and none of them are moved.
- Any local-only files (like a `.env.local`) exist only in the original FE folder. Copy them into `apps/frontend/` manually afterwards.

### 4.3 Merge FE history into the BE repo

```bash
cd "/c/My Web Projects/upravnik-platform"
git remote add fe "/c/My Web Projects/fe-migrate"
git fetch fe
git merge fe/main --allow-unrelated-histories -m "chore: merge frontend history into monorepo"
git remote remove fe
```
Expected conflicts: only root-level files both repos still have (`.gitignore` if it was left at the root in both). Resolve by keeping the union, then finalize in phase 5.

Verify history: `git log --oneline --follow apps/frontend/package.json` shows FE commits.

---

## 5. Root workspace setup

### 5.1 Root `package.json`
```json
{
  "name": "upravnik-platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "nx run-many -t dev",
    "build": "nx run-many -t build",
    "lint": "nx run-many -t lint",
    "test": "nx run-many -t test",
    "affected:build": "nx affected -t build",
    "affected:test": "nx affected -t lint test build",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  },
  "devDependencies": {}
}
```
- Keep each app's `package.json` with its own `name`, `scripts`, and **runtime `dependencies`**. Shared **devDependencies** (typescript, eslint, prettier, `@types/node`) move to the root.
- Rename to scoped names, for example `@upravnik/backend` and `@upravnik/frontend`. These become the Nx project names. Do this now, since renaming later is annoying.
- **Version reconciliation:** pick one `typescript` (^5.7), one `eslint` (^9), one `@types/node` (use `^24`, matching Node 24, and check the FE still type-checks). Remove the duplicates from the app `package.json`s.

### 5.2 Install
```bash
rm -f apps/*/package-lock.json                  # one lockfile only, at root
rm -rf apps/*/node_modules node_modules
npm install
npm install -D nx @nx/js @nx/next @nx/eslint @nx/jest
```
Native module `bcrypt` needs its build/prebuild to succeed on Windows, so watch for it in the install output.

### 5.3 `nx.json`
Start from `npx nx init` output, then make sure it has:
```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json", "{workspaceRoot}/package-lock.json"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/test/**/*"]
  },
  "plugins": [
    { "plugin": "@nx/next/plugin", "options": {} },
    { "plugin": "@nx/eslint/plugin", "options": { "targetName": "lint" } },
    { "plugin": "@nx/jest/plugin", "options": { "targetName": "test" } }
  ],
  "targetDefaults": {
    "build": { "dependsOn": ["^build"], "cache": true },
    "lint":  { "cache": true },
    "test":  { "cache": true }
  }
}
```
The BE `build` (`nest build`) comes from its `package.json` script. Nx infers it, so mark it cacheable via `targetDefaults` or the app's `nx` block (`"nx": { "targets": { "build": { "outputs": ["{projectRoot}/dist"], "cache": true } } }`).

### 5.4 Root shared config files
- **`tsconfig.base.json`:** minimal shared options only (`skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `isolatedModules`). **Don't** force the BE's `nodenext` or FE's `bundler` on each other. Each app's `tsconfig.json` may `extends` the base, but keep its own `module`/`moduleResolution`. This is where migrations most often break things, so change as little as possible.
- **`.prettierrc`:** the BE's file was left at the root in 4.1, so it already applies to the whole repo. The FE has no Prettier config, so nothing conflicts. Expect a formatting diff the first time Prettier runs on FE files, and commit that as its own commit.
- **`eslint.config.mjs` (root):** ESLint 9 flat config. Each app keeps its own config (Nest vs `eslint-config-next` differ). The root file is only for shared ignores and rules. Nx's ESLint plugin picks up each project's config automatically.
- **`.gitignore` (root):** union of both, with paths anchored properly:
  ```
  node_modules
  dist
  .nx/cache
  .nx/workspace-data
  apps/frontend/.next
  apps/frontend/out
  apps/frontend/tsconfig.tsbuildinfo
  coverage
  .env
  .env*.local
  !.env.example
  apps/frontend/next-env.d.ts
  ```
  Note the existing anchored patterns (`/node_modules`, `/.next/`, `/dist`) will **stop matching** after the move. Rewrite them, or the build output will show up in `git status`.
- **`.gitattributes`:** `* text=auto eol=lf` to stop CRLF churn on Windows.
- **`.nvmrc`** (`24`) and `"engines": { "node": ">=24" }` in the root `package.json`.
- **`.editorconfig`:** optional.

### 5.5 `docker-compose.yml`
Move to the repo root (`git mv apps/backend/docker-compose.yml .` if it ended up there). It only defines Postgres, so no path changes are needed. `db:up` / `db:down` root scripts wrap it.

---

## 6. App-level fixes

### 6.1 Backend (`apps/backend`)
- **Prisma setup (checked):** Prisma config isn't in `package.json`. It lives in `prisma.config.ts` (schema path, migrations path, `DATABASE_URL` via `dotenv/config`). The generator is:
  ```prisma
  generator client {
    provider = "prisma-client-js"
  }
  ```
  With no `output`, the client is generated into `node_modules/.prisma/client` and imported from `@prisma/client`.
  - **Monorepo impact:** npm workspaces hoists `@prisma/client` to the **root** `node_modules`, so the client is generated at the root (`node_modules/.prisma/client`). That works, since there's only one Prisma app. But the client only exists after `prisma generate` runs, which is why the `prisma:generate` dependency below matters (fresh clones, CI, and after every `npm ci`).
  - **`generated/prisma` is a dead leftover.** It contains the output of the newer `prisma-client` generator (`client.ts`, `models/`, and so on) from an earlier config, dated 2026-06-12. Nothing imports it, and it's gitignored. Delete it during the move (4.1 already does `rm -rf generated`) and drop `/generated/prisma` from `.gitignore`.
  - **Leave the generator as is for the migration.** Switching to `provider = "prisma-client"` with an explicit `output` (Prisma 7's recommended generator) removes the hoisting dependency, but it changes all 14 imports. Do it as a separate task afterwards if at all.
- Run Prisma commands with the **cwd = `apps/backend`** so `prisma.config.ts` still finds `prisma/schema.prisma` and `.env`. Nx runs package scripts in the project root, so `nx run @upravnik/backend:prisma:generate` does this.
- Add scripts to `apps/backend/package.json`: `"prisma:generate": "prisma generate"`, `"prisma:migrate": "prisma migrate dev"`. Then make `build`, `test`, and `lint` depend on generation, in the app's `nx` block: `"targets": { "build": { "dependsOn": ["prisma:generate"] }, "test": { "dependsOn": ["prisma:generate"] } }`. This replaces the "did I run generate?" step on fresh clones and CI.
- The `seed` script uses `ts-node --project tsconfig.json` and `tsconfig-paths`. It should keep working since it runs from `apps/backend`, but test it.
- Jest config lives in `package.json` (`rootDir: "src"`). It's relative, so it survives the move. `@nx/jest/plugin` infers the `test` target from it. If inference doesn't pick it up, add an explicit `jest.config.ts`. `test:e2e` uses `test/jest-e2e.json`, which is also relative and should still work.
- `tsconfig.json` has `baseUrl: "./"` and `outDir: "./dist"`. Both are relative to the app, so they're fine. Do **not** switch `extends` to the base until everything builds.
- `.env`: stays at `apps/backend/.env`. Add `apps/backend/.env.example` if there isn't one (recommended).
- `postman/` and `.postman/resources.yaml`: the YAML may hold relative paths or IDs. Open it after the move and check that it still resolves.

### 6.2 Frontend (`apps/frontend`)
- `next.config.ts`: with npm workspaces hoisting `node_modules` to the repo root, Next may warn about multiple lockfiles or a wrong workspace root. If so, set `outputFileTracingRoot` to the monorepo root (`path.join(__dirname, "../../")`). Confirm `next build` succeeds.
- The `@/*` path alias is relative (`./*`), so it survives.
- `tsconfig.json` `include` has `.next/types/**` (relative), so it's fine.
- Tailwind 4 is configured through `postcss.config.mjs` plus CSS. Tailwind scans the project directory automatically, so it should be unaffected. Verify styles render.
- `components.json` (shadcn) has relative aliases. Run `npx shadcn add ...` from `apps/frontend` in future.
- **Frontend env (new):** `lib/axios.ts` already reads `NEXT_PUBLIC_API_URL` and falls back to `http://localhost:3000/api`. Add:
  - `apps/frontend/.env.example` (committed): `NEXT_PUBLIC_API_URL=http://localhost:3000/api`
  - `apps/frontend/.env.local` (not committed): a copy of the example.
  - The FE `.gitignore` has `.env*`, which would also ignore `.env.example`. Add `!.env.example` to the root `.gitignore` (5.4).
  - `NEXT_PUBLIC_*` values are baked in at **build** time, so deploys must set this before `next build`.

### 6.3 Ports and running both together
**Checked: they collide.** Nest listens on `process.env.PORT ?? 3000` and the BE `.env` has no `PORT`. `next dev` also defaults to 3000. It works today only because whichever starts second either moves (Next auto-picks 3001) or crashes (Nest throws `EADDRINUSE`). With `nx run-many -t dev` starting both in parallel, that becomes a race.

Fix:
- BE stays on **3000**. The FE's axios fallback already points there, so nothing else changes.
- FE moves to **3001**: in `apps/frontend/package.json`, `"dev": "next dev -p 3001"` and `"start": "next start -p 3001"`.
- Add `PORT=3000` to `apps/backend/.env.example` so the port is explicit.
- CORS: `app.enableCors()` with no options allows every origin, and the chat gateway uses `origin: '*'`, so no change is needed for dev. Lock these down to the FE origin before production (separate task).
- Root `npm run dev` (`nx run-many -t dev`) then starts both. The BE's dev script is `start:dev`, so add `"dev": "nest start --watch"` to the BE `package.json` so both apps answer to the same target name.

### 6.4 Docs, Claude files, and misc
- **`CLAUDE.md`:** create a root `CLAUDE.md` (shared rules, commands, layout) and keep `apps/backend/CLAUDE.md` and `apps/frontend/CLAUDE.md` for app-specific rules. Remove the BE `.gitignore` entries for `CLAUDE.md` and `upravnik-platform.md` only if you want them tracked (**your call**, as the BE currently keeps them private).
- `AGENTS.md` (FE) stays in `apps/frontend`.
- `.claude/` dirs: merge into a single root `.claude/` (settings, commands). Resolve conflicts by hand.
- `docs/`: keep `apps/backend/docs` and `apps/frontend/docs` where they are. New cross-cutting docs (this plan) go in root `docs/`.
- `README.md`: new root README with a quickstart (prereqs, `npm install`, `npm run db:up`, `nx run @upravnik/backend:prisma:migrate`, `npm run dev`). Keep the app READMEs.

---

## 7. Verify (definition of done for the migration)

Run in order from the repo root. Each must pass on a **fresh clone** of the `monorepo` branch, not only on your machine:

```bash
npm ci
npx nx show projects                     # lists the two projects
npx nx graph                             # sanity check the project graph
npm run db:up
npx nx run @upravnik/backend:prisma:generate
npx nx run @upravnik/backend:prisma:migrate   # against local Postgres
npx nx run-many -t lint
npx nx run-many -t test
npx nx run-many -t build
npm run dev                              # FE talks to BE end to end (log in, load a page)
npx nx run-many -t build                 # 2nd run should be cached ("[local cache]")
```
Also check:
- [ ] `git log --follow` works on files in both apps
- [ ] `git status` is clean after a build (no stray artifacts)
- [ ] BE seed script runs
- [ ] BE e2e test runs (`test:e2e`)
- [ ] Postman collections open

---

## 8. Optional follow-ups (after the merge is stable)

1. **Shared package** `packages/api-types` (or `contracts`): DTO types shared by FE and BE, or an API client generated from the BE's Swagger spec (`@nestjs/swagger` is already installed). This is the main payoff of the monorepo. Create it with `nx g @nx/js:lib`.
2. **Module boundaries:** `@nx/enforce-module-boundaries` ESLint rule with tags (`scope:backend`, `scope:frontend`, `scope:shared`) so the FE can never import BE code.
3. **Dockerfiles** per app, using `nx prune`/`nx build` in the image build.
4. **Remote cache:** Nx Cloud, or self-hosted cache, if CI times grow.
5. **Husky + lint-staged** running `nx affected` on pre-commit.
6. **Renovate/Dependabot** configured for the single root lockfile.

---

## 9. CI/CD

Neither repo currently has CI, so this is greenfield. Add `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  main:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: upravnik }
        ports: ['5432:5432']
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/upravnik?schema=public
      JWT_SECRET: ci-only-secret
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: nrwl/nx-set-shas@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx nx affected -t lint test build
```
- `fetch-depth: 0` + `nx-set-shas` is what makes `affected` work.
- The BE `.env` holds exactly `DATABASE_URL` and `JWT_SECRET`, and both are set above. A throwaway value is fine for CI. Use a GitHub secret for anything real.
- **Deployment:** if the FE or BE deploys from its own repo today (Vercel, Render, and so on), reconfigure each to the new repo with **Root Directory** = `apps/frontend` / `apps/backend`. Use the install command `npm ci` at the workspace root, and the build command `npx nx build @upravnik/<app>`. Do this **before** archiving the old repos, and confirm a deploy works from the branch.

---

## 10. Cutover and cleanup

1. Open a PR `monorepo` -> `main` in `upravnik-platform`. Review the diff. It should be mostly renames plus new root config.
2. Merge with a **merge commit** (not squash or rebase). Squashing throws away the preserved history.
3. Update local clones: everyone (just you?) re-clones or deletes old folders.
4. Delete `C:\My Web Projects\fe-migrate` and, once you're confident, the old `upravnik-platform-frontend` folder.
5. **Archive** `Valuh-Marko/upravnik-platform-frontend` on GitHub. Update its README to point at the monorepo. Don't delete it for at least a few weeks.
6. Update webhooks, secrets, and integrations (deploy hooks, GitHub secrets) in the merged repo.

## 11. Rollback

Until step 10.2, `main` is untouched, so rollback = delete the `monorepo` branch. After merging, `git revert -m 1 <merge-commit>` restores the BE-only tree, and the `pre-monorepo` tags on both repos mark the last known-good state. The FE repo is never modified (the work happens in a clone), so it can be un-archived at any point.

## 12. Risks summary

| Risk | Mitigation |
|---|---|
| Anchored `.gitignore` patterns stop matching after the move | Rewrite them (5.4), then check `git status` after a build |
| Prisma client output path or `.env` lookup breaks | Run Prisma from `apps/backend`, verify `generator output`, add `prisma:generate` as a build/test dependency |
| Dependency conflicts from hoisting (`@types/node`, `typescript`) | Single version at the root (5.1), run all builds and tests |
| `nodenext` (BE) vs `bundler` (FE) tsconfig mismatch | Don't unify. Only share safe options via `tsconfig.base.json` |
| Port collision (confirmed: Next and Nest both on 3000) | BE 3000, FE 3001 (6.3) |
| Prisma client missing after install (it's generated into hoisted `node_modules`) | `prisma:generate` as a dependency of build and test (6.1) |
| Windows file locks / CRLF | Stop dev servers first, `.gitattributes` with `eol=lf` |
| Lost history | Move-then-merge (phase 4), verify with `git log --follow`, merge commit only |
| Deploys break | Reconfigure root directory per app and test before archiving the old repo |

## 13. Suggested order and effort

| Phase | Work | Rough effort |
|---|---|---|
| 3 | Safety net | 15 min |
| 4 | Move and merge history | 1 hr |
| 5 | Root workspace, Nx, install | 1-2 hr |
| 6 | App fixes (Prisma, Next, ports) | 1-3 hr, depends on surprises |
| 7 | Verify | 1 hr |
| 9 | CI and deploy config | 1-2 hr |
| 10 | Cutover | 30 min |
| 8 | Shared package (optional) | separate task |
