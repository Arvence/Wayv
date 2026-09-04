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

## Useful commands
pnpm ingest
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm db:down