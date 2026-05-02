# SkillKitHub — Replit Project

## Overview
SkillKitHub is a monorepo for the universal registry of AI agent workflows (Kits) and expert instruction sets (Skills). All agents welcome — Cursor, Claude, Codex, and more. It uses Turborepo to manage multiple apps and shared packages.

## Architecture

### Apps
- **`apps/web`** — Next.js 16 frontend, runs on port 5000
- **`apps/api`** — Fastify REST API backend, runs on port 8080

### Shared Packages
- **`packages/schema`** (@kithub/schema) — Zod schemas and kit.md parser
- **`packages/db`** (@kithub/db) — Drizzle ORM + Postgres client
- **`packages/sdk`** (@kithub/sdk) — TypeScript SDK for SkillKitHub API
- **`packages/ui`** (@repo/ui) — Shared React components
- **`packages/cli`** (@kithub/cli) — CLI tool
- **`packages/mcp-server`** (@kithub/mcp-server) — MCP server

## Workflows
- **"Start application"** — Runs `turbo dev --filter=web` on port 5000 (webview)
- **"API Server"** — Runs `turbo dev --filter=api` on port 8080 (console)

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required for database features)
- `SUPABASE_URL` — Supabase project URL used by the API auth verifier
- `SUPABASE_SECRET_KEY` — Supabase secret/service-role key used by the API auth verifier
- `NEXT_PUBLIC_SUPABASE_URL` — Public Supabase URL used by the web app
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public Supabase browser key used by the web app
- `NEXT_PUBLIC_API_URL` — API base URL used by the frontend
- `WEB_URL` — Frontend URL for CORS and notification links (defaults to http://localhost:5000)
- `OPENAI_API_KEY` — *(optional)* enables semantic search and related-kits via OpenAI `text-embedding-3-small`. Falls back to keyword/tag matching when unset (one-time warning logged).

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
- **Buttons**: `.btn`, `.btn-secondary`, `.btn-sm`, `.btn-full`, `.btn-link`, `.btn-back`, `.btn-danger`
- **Modal**: `.modal-overlay`, `.modal-content`, `.modal-actions`
- **Steps**: `.step-indicator`, `.step-bar`, `.step-panel`, `.step-heading`, `.step-description`
- **Alerts**: `.alert`, `.alert-error`, `.alert-warning`, `.alert-success`, `.alert-info`
- **Results**: `.result-centered`, `.result-icon`, `.result-title`, `.result-description`
- **Skeletons**: `.skeleton`, `.skeleton-card`, `.skeleton-stat`, `.skeleton-text`
- **Scores**: `.score-circle`, `.score-badge` (with `.high`, `.medium`, `.low` variants)
- **Layout utils**: `.centered-card`, `.flex-between`, `.flex-end`, `.grid-2col`, `.item-grid`

### Components
- **Toast system**: `apps/web/app/components/Toast.tsx` — React context + provider for notifications (success/error/warning/info). Wired in root layout via `<ToastProvider>`. Use `useToast()` hook.
- **Skeleton loaders**: `apps/web/app/components/Skeleton.tsx` — `<SkeletonCard>`, `<SkeletonStat>`, `<SkeletonText>` for loading states.
- **Analytics drawer**: `apps/web/app/components/Analytics.tsx` — Per-kit analytics modal with SVG bar chart (30-day installs) and target breakdown. Used on Dashboard.
- **Markdown preview**: `apps/web/app/components/MarkdownPreview.tsx` — Lightweight live-rendered markdown preview (no external deps). Used in publish wizard Step 1.

### Accessibility
- Skip-to-content link targeting `#main-content`
- Global `:focus-visible` ring styling (2px accent outline)
- ARIA labels on nav, form inputs, score badges
- `aria-hidden` on decorative icons
- `--text-tertiary` adjusted to `#7a7a8a` for WCAG AA contrast

### Pages
- `/` — Homepage (hero, quick start, how it works, features)
- `/auth` — Auth (centered card, register/login toggle, verification)
- `/publish` — Publish kit (3-step wizard with progress bar, live markdown preview in Step 1). Supports `?edit=<slug>` for editing existing kits.
- `/dashboard` — User dashboard (stats grid, owned kit list with Analytics/Edit/Unpublish actions). Uses `GET /api/kits/mine` for publisher-owned kits.
- `/registry` — Registry listing with sort selector (newest/installs/score), pagination (20/page), and "Trending Kits" section (top 3 by installs). Cards show **VerifiedBadge** + **Stars**.
- `/registry/[slug]` — Kit detail with Version History, **Related Kits rail**, **Scan diff panel** (added/removed/unchanged checks across releases), **Ratings & reviews block** (auth-gated submission), VerifiedBadge on publisher line, dynamic OG/Twitter meta.
- `/collections` — Index of curated collections (cards with emoji, kit count, total installs, average stars).
- `/collections/[slug]` — Collection detail with kit list and **Install Stack** sidebar (client-side `InstallStack.tsx` with copy-to-clipboard for CLI one-liner + agent prompt + collapsible install URLs).
- `/skills` — Skills directory (card grid with search/filter, category badges, install counts)
- `/skills/[slug]` — Skill detail page (emoji, category, description, tags, OG/Twitter meta)
- `/publishers/[slug]` — Publisher profile page (agent name + VerifiedBadge, kit count, total installs, avg score, kit list)
- 404 — `apps/web/app/not-found.tsx` (styled 404 with gradient text)

### Footer
Multi-column layout: brand description, Product links, Resources links, Community links (GitHub, Discord, Twitter). Bottom bar with copyright and tagline.

## Key Configuration Changes (Replit Migration)
- Next.js dev/start scripts updated to use `-p 5000 -H 0.0.0.0` for Replit proxy compatibility
- Turbo UI changed from `tui` to `stream` (TUI mode blocks in Replit's environment)
- Upgraded from Node.js 18 to Node.js 20 (required by Next.js 16)
- Fixed TypeScript strict mode errors in `packages/schema/src/index.ts`
- Fixed `@fastify/jwt` type conflicts in `apps/api/src/middleware/auth.ts`
- Fixed DB SSL: Replit's internal Postgres (helium) doesn't use TLS — `isReplitHelium` check in `packages/db/src/index.ts` and seed files
- Fixed SQL `ANY()` array syntax for postgres.js compatibility in `batchFetchLatestReleases` and `batchFetchLatestScores`
- Added `allowedDevOrigins` to `apps/web/next.config.js` for Replit proxy HMR support
- Fixed `scripts/post-merge.sh`: updated deprecated `drizzle-kit push:pg` → `drizzle-kit push`
- Set env vars: `WEB_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_URL`, `NODE_ENV`, `PORT`
- Database schema pushed and seeded with sample kits + skills

## Database Migrations (Drizzle)
Migration files are managed via Drizzle Kit and stored in `packages/db/drizzle/`.

- **Generate migrations** after changing the schema: `cd packages/db && npm run generate`
- **Apply migrations** to the database: `cd packages/db && npm run migrate` (requires `DATABASE_URL`)
- **Push schema** directly (dev only): `cd packages/db && npm run push`
- Migration config: `packages/db/drizzle.config.ts`

## API Endpoints
- `GET /api/kits` — Public registry listing with sort/pagination (`?sort=installs|score|newest`, `?page=1`, `?limit=20`)
  - Discovery params: `?q=<text>&mode=keyword|semantic` (semantic falls back to keyword when `OPENAI_API_KEY` is missing)
  - `?related_to=<slug>&limit=N` — returns related kits via embedding cosine similarity (or tag overlap fallback). Response includes `mode: "embedding"|"tags"|"none"`.
- `GET /api/kits/trending` — Top 3 kits by install count
- `GET /api/kits/mine` — Publisher's own kits (auth required)
- `GET /api/kits/:slug` — Kit detail with publisherName, **publisherVerified, averageStars, ratingCount** (404 for unpublished)
- `GET /api/kits/:slug/versions` — Version history with scan results
- `GET /api/kits/:slug/scans` — Full scan history with `diffs[]` and `versions[]`. Without query params: returns adjacent diffs (newest first). With `?base=<v>&head=<v>`: returns a single targeted diff between any two release versions.
- `GET /api/kits/:slug/install` — Install payload
- `POST /api/kits` — Publish/update a kit (auth required). Triggers embedding generation if `OPENAI_API_KEY` is set.
- `DELETE /api/kits/:slug` — Unpublish a kit (auth required, owner only)
- `POST /api/kits/:slug/learnings` — Submit a learning
- `GET /api/kits/:slug/analytics` — Daily installs (30d) and target breakdown (auth required, owner only)
- `GET /api/kits/:slug/ratings` — Public list of ratings + aggregated `averageStars`, `ratingCount`
- `POST /api/kits/:slug/ratings` — Submit/update a 1-5 star rating with optional body (auth required, cannot rate own kit; rate-limited)
- `GET /api/publishers/:slug` — Publisher profile (agent name, **verified flag**, kit count, total installs, avg score, kits list)
- `GET /api/collections` — List curated collections (slug, title, description, curator, kit count, total installs, average stars, featured flag)
- `GET /api/collections/:slug` — Collection detail with hydrated kit list
- `GET /api/collections/:slug/install` — Install Stack: returns `cliCommand` (e.g. `npx @kithub/cli install-collection <slug> --target=<t>`), per-kit `installUrls`, full `instructions` markdown, and `supportedTargets`. Validates `?target=` against `SUPPORTED_TARGETS` (400 on invalid).

## API Rate Limiting
The API uses `@fastify/rate-limit` with per-route configuration (global rate limiting is disabled).
Rate-limited endpoints (10 req/min per IP):
- `POST /api/auth/register` (legacy route; 410 outside tests)
- `POST /api/auth/login` (legacy route; 410 outside tests)
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

## Notifications
- Install and learning events trigger publisher email notifications (max 1 per kit per type per 24h window)
- `notification_logs` table tracks sent notifications to enforce the 24h dedup window
- Email delivery: logs to console in dev mode; set `SMTP_URL` env var to send real emails via nodemailer
- Optional env vars: `SMTP_URL`, `EMAIL_FROM` (defaults to noreply@kithub.dev)

## CLI (`packages/cli`)
- Token persistence: `~/.kithub/config.json` stores token, email, agentName
- Commands: `search`, `install`, `install-collection`, `publish`, `login`, `verify`, `whoami`, `logout`
- `install` auto-detects target (Cursor, Claude Code, Codex) and writes files to disk
- `install-collection <slug>` fetches the collection bundle and installs every kit in order, with `--target=<t>` and `--dry-run` flags
- `publish` prints a live URL after successful publish, exits with code 1 if blocked
- `login` / `verify` still use the retired email-code API flow and are not production-ready
- `publish` can still work if `KITHUB_TOKEN` is set to a valid Supabase access token

## Testing

### Test Runner
- `npm test` from root runs all tests via Turborepo
- Uses **Vitest** as the test framework

### Test Suites
- **`packages/schema`** — 39 unit tests covering:
  - `parseKitMd` (valid/invalid kits, conformance levels, missing sections)
  - `scanKit` (secrets detection, destructive patterns, model grounding, scoring)
  - `KitFrontmatterSchema` / `KitBodySchema` (Zod validation)
  - `generateInstallPayload` / `isValidTarget` (all 5 install targets)
- **`apps/api`** — integration tests covering:
  - Health check endpoint
  - Legacy auth flow used only in test mode
  - Kit CRUD: publish → list → detail → install payload
  - Error cases: 401/400/404 responses
  - **Discovery (`discovery.test.ts`, 16 tests)**: keyword/semantic search modes + fallback, related-kits with tag-overlap fallback, ratings auth-gated + self-rating block + upsert + invalid stars, public ratings list, kit-detail rating aggregates, scan history, collections index/404/install bundle (CLI command + invalid-target rejection), publisher verified flag.
  - **MCP contracts (`packages/mcp-server/src/__tests__/tools.test.ts`, 11 tests)**: validates the input schemas of `search_kits`, `get_related_kits`, `list_collections`, `get_collection` — including `mode` enum, `target` enum bound to `SUPPORTED_TARGETS`, and `limit` range guards. Guards against silent contract drift for downstream agents.

### Running Tests
```bash
npm test                    # Run all tests
cd packages/schema && npx vitest run  # Schema tests only
cd apps/api && npx vitest run         # API tests only
```

## Seed Data
- **Basic seed**: `npx tsx packages/db/src/seed.ts` — Creates test user + 3 sample kits, marks QuantBot/OpsBot publishers as **verified**, seeds 3 curated collections (`indie-hacker-starter`, `engineering-quality`, `ops-comms`), seeds sample ratings, and **backfills embeddings** when `OPENAI_API_KEY` is set.
- **JourneyKits seed**: `npx tsx packages/db/src/seed-journeykits.ts` — Fetches ~20 real kits from JourneyKits.ai, anonymizes authors, and inserts them under a "CommunityCurator" publisher. Idempotent (safe to re-run).
- **Skills seed**: `npx tsx packages/db/src/seed-skills.ts` — Creates 10 universal agent skills under "SkillCurator" publisher. Idempotent.

## Discovery & Trust (Schema Additions)
- `kit_ratings` — 1–5 stars + optional body, unique on `(kit_slug, publisher_id)`, self-rating blocked at API.
- `collections` + `collection_kits` — curator-authored bundles with display order; aggregates fetched via `batchFetchKitsBySlugs`.
- `kit_embeddings` — `jsonb` vector storage (no pgvector dependency); cosine similarity computed in JS by `semanticSearchKits` and `getRelatedKits`.
- `publisher_profiles.verified_at` — timestamp; surfaced as `verified` boolean on publisher endpoints and `publisherVerified` on kit detail.

## Post-Merge Setup
- Script: `scripts/post-merge.sh` — Runs `npm install`, rebuilds shared packages, and pushes DB schema
- Configured in `.replit` `[postMerge]` section
- Runs automatically after task agent merges

## Known Issues
- API auth expects Supabase access tokens
- Legacy `/api/auth/*` endpoints are test-only
- CLI auth commands still need a Supabase-native replacement instead of the retired email-code flow
