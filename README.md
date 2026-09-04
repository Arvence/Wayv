# Wavy Take-home

Campaign marketplace take-home with admin/creator flows,
budget-safe approvals, daily metrics and payout calculation.

## Requirements
Node
pnpm
Docker

## Setup

corepack enable
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm dev

Windows PowerShell copy command...

Open localhost:5000

Demo user switching is disabled by default. Set `DEMO_AUTH_ENABLED=true` only in a controlled demo environment.

## Useful commands
pnpm ingest
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm db:down