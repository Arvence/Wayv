# Notes

## Setup

The exact fresh-clone commands are in `README.md`. The local database uses PostgreSQL 16 in Docker Compose with a persistent named volume and development-only credentials.

## Current scope

The initial schema and migration cover users, campaigns, submissions, and daily submission metric snapshots. Seed data, application procedures, and business tests remain intentionally deferred. The only procedure is a temporary health check that verifies the tRPC and database path end to end.

## Assumptions

- PostgreSQL 16 Alpine provides a small, stable local database image.
- Host port 5433 is used because another local project already occupies 5432; PostgreSQL still listens on 5432 inside the container.
- Docker Compose keeps the local database setup self-contained.
- pnpm 11.25.0 is pinned for reproducible package-manager behavior.
- New submissions receive one initial daily metric snapshot at creation time; this is an implementation assumption for pending submissions.

## Deferred work

Concurrent budget protection will be implemented later with a PostgreSQL transaction and explicit locking. No additional tables are introduced for it at this stage.

## AI tooling

AI tooling was used to scaffold the foundation and review configuration and verification output. Generated starter content and dependency decisions were checked before being kept.
