# Upravnik Platform

Residential building management platform. Nx monorepo with npm workspaces.

| Path | Project | Stack | Dev port |
|---|---|---|---|
| `apps/backend` | `@upravnik/backend` | NestJS 11, Prisma 7, PostgreSQL | 3000 |
| `apps/frontend` | `@upravnik/frontend` | Next.js 16, React 19, Tailwind 4 | 3001 |
| `packages/` | shared libraries | — | — |

See `apps/backend/README.md` and `apps/frontend/README.md` for app details.

## Prerequisites

- Node.js 24 (`.nvmrc`) and npm 11
- Docker Desktop (local Postgres)

## Quickstart

```bash
npm install                                   # root only; one lockfile for the whole repo
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
npm run db:up                                 # Postgres on :5432
npx nx run @upravnik/backend:prisma:migrate   # apply migrations + generate Prisma client
npx nx run @upravnik/backend:seed             # optional test data
npm run dev                                   # backend :3000, frontend :3001
```

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Start both apps |
| `npm run build` / `lint` / `test` | Run the target for every project |
| `npm run affected:test` | Lint, test and build only what changed |
| `npm run db:up` / `db:down` | Start / stop local Postgres |
| `npx nx run <project>:<target>` | Run one target, e.g. `npx nx run @upravnik/backend:test:e2e` |
| `npx nx graph` | Visualise the project graph |
| `npm install <pkg> -w @upravnik/<app>` | Add a dependency to one app |
