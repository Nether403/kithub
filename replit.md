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

## Design System (apps/web)

### Theme
- Dark theme: `--bg: #030304`, `--accent: #00e88f` (green)
- Fonts: Inter (sans), JetBrains Mono (mono)
- All design tokens in `apps/web/app/globals.css`

### CSS Architecture
Global CSS classes in `globals.css` organized by section:
- **Layout**: `.container`, `.page-section`, `.page-narrow`, `.page-header`, `.page-header-row`
- **Cards**: `.glass-panel`, `.kit-card`, `.stat-card`, `.stat-grid`
- **Forms**: `.input`, `.input-code`, `.input-mono`, `.form-group`, `.form-hint`
- **Buttons**: `.btn`, `.btn-secondary`, `.btn-sm`, `.btn-full`, `.btn-link`, `.btn-back`
- **Steps**: `.step-indicator`, `.step-bar`, `.step-panel`, `.step-heading`, `.step-description`
- **Alerts**: `.alert`, `.alert-error`, `.alert-warning`, `.alert-success`, `.alert-info`
- **Results**: `.result-centered`, `.result-icon`, `.result-title`, `.result-description`
- **Skeletons**: `.skeleton`, `.skeleton-card`, `.skeleton-stat`, `.skeleton-text`
- **Scores**: `.score-circle`, `.score-badge` (with `.high`, `.medium`, `.low` variants)
- **Layout utils**: `.centered-card`, `.flex-between`, `.flex-end`, `.grid-2col`, `.item-grid`

### Components
- **Toast system**: `apps/web/app/components/Toast.tsx` — React context + provider for notifications (success/error/warning/info). Wired in root layout via `<ToastProvider>`. Use `useToast()` hook.
- **Skeleton loaders**: `apps/web/app/components/Skeleton.tsx` — `<SkeletonCard>`, `<SkeletonStat>`, `<SkeletonText>` for loading states.

### Accessibility
- Skip-to-content link targeting `#main-content`
- Global `:focus-visible` ring styling (2px accent outline)
- ARIA labels on nav, form inputs, score badges
- `aria-hidden` on decorative icons
- `--text-tertiary` adjusted to `#7a7a8a` for WCAG AA contrast

### Pages
- `/` — Homepage (hero, quick start, how it works, features)
- `/auth` — Auth (centered card, register/login toggle, verification)
- `/publish` — Publish kit (3-step wizard with progress bar)
- `/dashboard` — User dashboard (stats grid, kit list with skeletons)
- `/registry` — Registry (user-managed, do not modify)
- 404 — `apps/web/app/not-found.tsx` (styled 404 with gradient text)

### Footer
Multi-column layout: brand description, Product links, Resources links, Community links (GitHub, Discord, Twitter). Bottom bar with copyright and tagline.

## Key Configuration Changes (Replit Migration)
- Next.js dev/start scripts updated to use `-p 5000 -H 0.0.0.0` for Replit proxy compatibility
- Turbo UI changed from `tui` to `stream` (TUI mode blocks in Replit's environment)
- Upgraded from Node.js 18 to Node.js 20 (required by Next.js 16)
- Fixed TypeScript strict mode errors in `packages/schema/src/index.ts`
- Fixed `@fastify/jwt` type conflicts in `apps/api/src/middleware/auth.ts`

## Database Migrations (Drizzle)
Migration files are managed via Drizzle Kit and stored in `packages/db/drizzle/`.

- **Generate migrations** after changing the schema: `cd packages/db && npm run generate`
- **Apply migrations** to the database: `cd packages/db && npx drizzle-kit migrate` (requires `DATABASE_URL`)
- **Push schema** directly (dev only): `cd packages/db && npm run push`
- Migration config: `packages/db/drizzle.config.ts`

## API Rate Limiting
The API uses `@fastify/rate-limit` with per-route configuration (global rate limiting is disabled).
Rate-limited endpoints (10 req/min per IP):
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/kits` (publish)

## API Error Format
All API error responses follow a consistent shape:
```json
{ "error": "Error Type", "message": "Human-readable description.", "statusCode": 400 }
```

## Error Handling (Frontend)
- **ErrorBoundary component**: `apps/web/app/components/ErrorBoundary.tsx` — Wraps all pages in the root layout to catch unexpected React errors.
- **Next.js error.tsx files**: `apps/web/app/dashboard/error.tsx`, `apps/web/app/registry/error.tsx`, `apps/web/app/registry/[slug]/error.tsx` — Route-level error boundaries with retry buttons.
- **Toast notifications**: API fetch failures surface user-friendly error messages via the existing toast system.

## Known Issues
- `DATABASE_URL` secret not set — API starts but DB calls fail at runtime
- JWT dev fallback secret in server.ts — ensure `JWT_SECRET` env var is set in production
