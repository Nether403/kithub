# KitHub — Replit Project

## Overview
KitHub is a monorepo for "The USB-C for AI" — a global registry for reusable, versioned AI agent workflows. It uses Turborepo to manage multiple apps and shared packages.

## Architecture

### Apps
- **`apps/web`** — Next.js 16 frontend, runs on port 5000
- **`apps/api`** — Fastify REST API backend, runs on port 8080

### Shared Packages
- **`packages/schema`** (@kithub/schema) — Zod schemas and kit.md parser
- **`packages/db`** (@kithub/db) — Drizzle ORM + Postgres client
- **`packages/sdk`** (@kithub/sdk) — TypeScript SDK for KitHub API
- **`packages/ui`** (@repo/ui) — Shared React components
- **`packages/cli`** (@kithub/cli) — CLI tool
- **`packages/mcp-server`** (@kithub/mcp-server) — MCP server

## Workflows
- **"Start application"** — Runs `turbo dev --filter=web` on port 5000 (webview)
- **"API Server"** — Runs `turbo dev --filter=api` on port 8080 (console)

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required for database features)
- `JWT_SECRET` — Secret for signing JWT tokens (defaults to dev secret if not set)
- `WEB_URL` — Frontend URL for CORS (defaults to http://localhost:3000)

## Package Manager
- npm (with npm workspaces)
- Node.js 20 required (Next.js 16 requires >= 20.9.0)
- Turborepo for task orchestration (using `stream` UI mode for Replit compatibility)

## Build Order
Shared packages must be built before apps:
1. `@kithub/schema` and `@kithub/db` (independent)
2. `@kithub/sdk` (depends on schema)
3. `apps/api` and `apps/web` (depend on packages above)

```bash
npx turbo run build --filter=@kithub/schema --filter=@kithub/sdk --filter=@kithub/db
```

## Key Configuration Changes (Replit Migration)
- Next.js dev/start scripts updated to use `-p 5000 -H 0.0.0.0` for Replit proxy compatibility
- Turbo UI changed from `tui` to `stream` (TUI mode blocks in Replit's environment)
- Upgraded from Node.js 18 to Node.js 20 (required by Next.js 16)
- Fixed TypeScript strict mode errors in `packages/schema/src/index.ts`
- Fixed `@fastify/jwt` type conflicts in `apps/api/src/middleware/auth.ts`
