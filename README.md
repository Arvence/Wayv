# Full-stack Project

A reusable full-stack application foundation with database connectivity, an initial campaign and submission schema, and a tRPC health check. Product features are intentionally deferred.

## Requirements

- Node.js 20.19+, 22.12+, or 24+
- pnpm 11.25.0 (declared in `package.json`)
- Docker with Docker Compose

## Fresh clone setup

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp .env.example .env`.

Open [http://localhost:5000](http://localhost:5000). The health card confirms both the tRPC connection and PostgreSQL access.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Stop PostgreSQL with `pnpm db:down`.
