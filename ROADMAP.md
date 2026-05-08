# SkillKitHub — v1 Launch Roadmap

> **Last updated:** 2026-05-09 | **Status:** Pre-launch

---

## Deployment Architecture

| Component | Platform | Notes |
|---|---|---|
| **Frontend** (`apps/web`) | Vercel | Next.js 16, `skillkithub.vercel.app` |
| **API** (`apps/api`) | Railway | Fastify, standalone Node.js server |
| **Database** | Neon (Postgres) | Serverless, branching for dev/staging |
| **Auth** | Supabase | Email OTP, session management |
| **Embeddings** | OpenAI | `text-embedding-3-small` via `OPENAI_API_KEY` |

---

## Phase 0 — Critical Blockers 🔴

Must be resolved before any public launch.

### 0.1 Fix MCP Server Build
- [ ] Verify `@modelcontextprotocol/sdk` resolves in monorepo (`npm install` at root)
- [ ] Add explicit TypeScript type annotations to all 8 tool handlers in `packages/mcp-server/src/index.ts`
- [ ] Verify `npm run build` passes for `@kithub/mcp-server`
- [ ] Run MCP tool schema tests (`packages/mcp-server/src/__tests__/tools.test.ts`)

**Why critical:** The MCP server is the primary value delivery for agents. Without it, the "agent-first" mission is DOA.

### 0.2 Deploy API to Railway
- [ ] Create Railway project and link to this repo
- [ ] Configure `apps/api` as the service root
- [ ] Set environment variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `WEB_URL`, `PORT`, `NODE_ENV=production`
- [ ] Set `OPENAI_API_KEY` for semantic search
- [ ] Verify `/health` endpoint returns OK
- [ ] Update `NEXT_PUBLIC_API_URL` on Vercel to point to the Railway URL

### 0.3 Migrate Database to Neon
- [ ] Create Neon project + production database
- [ ] Run `drizzle-kit push` or apply migrations against Neon
- [ ] Run seed scripts: `seed.ts`, `seed-skills.ts`, `seed-journeykits.ts`
- [ ] Update `DATABASE_URL` in Railway + Vercel + local `.env`
- [ ] Verify SSL connection works (`ssl: "require"`)
- [ ] Create a `dev` branch in Neon for local/staging development

### 0.4 Wire View Tracking in Web App
- [ ] Add `POST /api/kits/:slug/view` call on mount in `apps/web/app/registry/[slug]/page.tsx`
- [ ] Fire-and-forget (no await, no error handling needed)

---

## Phase 1 — Quick Wins 🟡

High value, low effort. Ship these in the first sprint after launch.

### 1.1 Fix Next.js Build Warning
- [ ] Remove deprecated `eslint` key from `apps/web/next.config.js` (if present)
- [ ] Verify clean build with `npm run build`

### 1.2 Expose Semantic Search in UI
- [ ] Add a "Keyword / Semantic" toggle to the registry search bar (`apps/web/app/registry/page.tsx`)
- [ ] Send `mode=semantic` or `mode=keyword` based on toggle state

### 1.3 Scan Score Badge on Kit Cards
- [ ] Add a colored shield badge (🛡️ 9/10) to `KitCard` components in registry grid
- [ ] Color code: green (8–10), yellow (5–7), red (1–4)

### 1.4 Wire View Tracking Calls from Dashboard Analytics
- [ ] Ensure the analytics endpoint (`GET /:slug/analytics`) returns `totalViews` + `dailyViews`
- [ ] Display views chart alongside installs in the Analytics drawer

### 1.5 `GET /api/install-targets` REST Endpoint
- [ ] Add a simple route that returns the `INSTALL_TARGET_DETAILS` map from `@kithub/schema`
- [ ] Currently only available via MCP tool — expose as REST for discoverability

---

## Phase 2 — High Impact Ideas 🚀

### 2.1 Embedding Backfill Script
- [ ] Create `packages/db/src/backfill-embeddings.ts`
- [ ] Iterate all published kits, fetch latest release, call `upsertKitEmbedding`
- [ ] Respect rate limits on OpenAI API (add 200ms delay between calls)
- [ ] Log progress: `[12/45] weekly-earnings-preview → stored`
- [ ] Add npm script: `"backfill:embeddings": "tsx src/backfill-embeddings.ts"`

**Why:** Semantic search only works for kits published after embeddings were enabled. This makes it useful for the entire catalog from day one.

### 2.2 `install-collection` CLI Command
- [ ] Add `install-collection <slug>` command to `packages/cli`
- [ ] Fetch `GET /api/collections/:slug/install?target=<t>` and iterate `installUrls`
- [ ] Support `--target=<t>` and `--dry-run` flags
- [ ] The API already generates the CLI command string — make it real

### 2.3 Scan Diff Panel on Kit Detail Page
- [ ] Surface `GET /api/kits/:slug/scans` data on the kit detail page (`/registry/[slug]`)
- [ ] Show "v1.2.0 vs v1.1.0: 2 warnings resolved, 1 new tip" with expandable details
- [ ] Use green/red badges for added/removed findings

### 2.4 Publisher Verification Admin Flow
- [ ] Add `POST /api/admin/publishers/:id/verify` endpoint (protected by secret header or admin role)
- [ ] Sets `verifiedAt` timestamp on publisher profile
- [ ] The UI already shows `VerifiedBadge` — this just enables granting it

### 2.5 OpenGraph / Social Preview Images
- [ ] Add `apps/web/app/api/og/route.tsx` using Next.js `ImageResponse`
- [ ] Render dynamic OG images showing: kit title, score badge, install count, publisher name
- [ ] Wire into `<head>` meta tags on `/registry/[slug]` pages

### 2.6 SkillKit of the Week
- [ ] Add a `featured_at` timestamp column to `kits` table (or reuse collections with a special slug)
- [ ] Surface on landing page hero section
- [ ] Add admin endpoint to set the featured kit
- [ ] Rotate weekly — builds return value and content discovery

---

## Phase 3 — Strategic Initiatives 🧠

### 3.1 Agent-Native API Manifest
- [ ] Create `GET /api/agent-manifest.json` endpoint
- [ ] Return machine-readable description of all tools, endpoints, and capabilities
- [ ] Optimized for LLM consumption (structured JSON, no HTML)
- [ ] Include: available tools, supported targets, search modes, collection slugs
- [ ] Cross-reference with `/.well-known/agent-kit.json` discovery endpoint

### 3.2 Journeycrawl Content Integration
- [ ] Review the ~150 scraped markdown files in `Journeycrawl/`
- [ ] Audit for anonymization (remove or replace original author names → generic publisher names)
- [ ] Update `seed-journeykits.ts` to parse and ingest all valid kit.md files
- [ ] Validate each against `@kithub/schema` parser before ingestion
- [ ] Filter duplicates (some files are duplicated under different URL paths)
- [ ] Target: add 40–60 unique, high-quality kits to the registry from this corpus

### 3.3 Email Delivery Setup
- [ ] Sign up for [Resend](https://resend.com) (free tier: 3,000 emails/month)
- [ ] Set `SMTP_URL` and `EMAIL_FROM` env vars on Railway
- [ ] Verify OTP codes are delivered to real inboxes
- [ ] Test publisher notification emails (install + learning events)

### 3.4 Publish CLI to npm
- [ ] Set up npm org or scope (`@kithub` or `@skillkithub`)
- [ ] Run `npm publish --access public` for `packages/cli`
- [ ] Verify `npx @kithub/cli search "deployment"` works from a clean machine
- [ ] Add CI/CD step to auto-publish on version bump

---

## Phase 4 — Feature Debt 🔧

Non-blocking but important for long-term quality.

### 4.1 Expand Test Coverage
- [ ] Add contract tests for all auth endpoints (register, login, verify, me, logout)
- [ ] Add publish flow tests (validation, scan blocking, version update)
- [ ] Add install flow tests (target validation, payload generation)
- [ ] Add ratings tests (self-rate prevention, upsert, aggregation)
- [ ] Add collections tests (list, detail, install bundle)
- [ ] Target: 80+ tests total (currently ~65)

### 4.2 `PATCH /api/kits/:slug` — Metadata-Only Updates
- [ ] Allow publishers to update title, summary, tags without re-publishing
- [ ] Does not create a new release — just updates the `kits` row
- [ ] Validate ownership via auth middleware

### 4.3 Supabase RLS Audit
- [ ] Review Supabase dashboard for row-level security policies
- [ ] Ensure tables have RLS enabled
- [ ] Verify service role key vs anon key access boundaries
- [ ] Document findings in a security checklist

### 4.4 Monitoring & Error Tracking
- [ ] Install `@sentry/nextjs` in `apps/web`
- [ ] Install `@sentry/node` in `apps/api`
- [ ] Configure DSN via env var `SENTRY_DSN`
- [ ] Set up alerting for 5xx errors and unhandled rejections

### 4.5 Clean Up Legacy Auth Routes
- [ ] The 410-Gone routes (`/api/auth/register`, `/api/auth/verify-email`, `/api/auth/login`) exist only for test compatibility
- [ ] Consider removing them entirely and updating tests to use Supabase mock
- [ ] Or keep with clear documentation explaining the test-only purpose

### 4.6 UI Polish Pass
- [ ] Review all Toast notifications for consistency
- [ ] Improve loading states (skeleton coverage on collections, ratings)
- [ ] Ensure mobile responsiveness on all new pages
- [ ] Verify WCAG AA compliance on rating stars, collection cards

---

## Future (v2+) — Not In Scope for v1

| Feature | Priority | Notes |
|---|---|---|
| Organizations / RBAC | Medium | Multi-team access control |
| LLM-powered scanner review | Low | Automated kit quality assessment via LLM |
| Hosted mode (live resolve) | Medium | Serve kit content at runtime instead of install-to-disk |
| Full RBAC / domain verification | Low | Enterprise feature |
| Notification preferences UI | Low | Let publishers control what notifications they receive |

---

## Execution Cadence

| Week | Focus |
|---|---|
| **Week 1** | Phase 0: MCP fix → Neon migration → Railway deploy → View tracking |
| **Week 2** | Phase 1: Quick wins (search toggle, scan badges, build warning) |
| **Week 3** | Phase 2: Embedding backfill, install-collection CLI, scan diff UI |
| **Week 4** | Phase 3: Agent manifest, Journeycrawl ingestion, email setup, npm publish |
| **Ongoing** | Phase 4: Test coverage, monitoring, polish |
