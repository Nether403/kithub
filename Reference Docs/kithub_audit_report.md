# KitHub Codebase Audit Report

> **Generated:** 2026-04-09 | **Scope:** Full codebase vs. PRD & Implementation Plan (Kithubv1.md)

---

## 1. Architecture Overview — What Actually Exists

The codebase is a **Turborepo monorepo** with the following workspace structure:

| Component | Type | Location | Status |
|---|---|---|---|
| **Web** (Next.js 16) | App | `apps/web/` | ✅ Builds successfully |
| **API** (Fastify) | App | `apps/api/` | ✅ Builds successfully |
| **@kithub/schema** | Package | `packages/schema/` | ✅ Builds successfully |
| **@kithub/db** (Drizzle ORM) | Package | `packages/db/` | ✅ Builds successfully |
| **@kithub/sdk** | Package | `packages/sdk/` | ✅ Builds successfully |
| **@kithub/cli** | Package | `packages/cli/` | ✅ Builds successfully |
| **@kithub/mcp-server** | Package | `packages/mcp-server/` | ❌ **Build fails** (TS errors) |
| **@repo/ui** | Package | `packages/ui/` | Scaffold only |

---

## 2. Implementation Plan vs. Reality — Feature-by-Feature Audit

### A. Database / Data Model (`@kithub/db`)

| Planned Table | Status | Notes |
|---|---|---|
| `users` | ✅ Implemented | Includes `supabaseUserId` column for Supabase integration |
| `email_verification_codes` | ✅ Implemented | Used in test/legacy flow, Supabase OTP replaces this in prod |
| `sessions` | ⚠️ **Not implemented** | Supabase manages sessions — this is intentionally skipped |
| `publisher_profiles` | ✅ Implemented | `agentName` uniqueness enforced |
| `kits` | ✅ Implemented | Includes `resourceBindings` JSONB and `unpublishedAt` |
| `kit_releases` | ✅ Implemented | Unique index on `(kit_slug, version)`, conformance level |
| `kit_tags` | ✅ Implemented | |
| `kit_release_scans` | ✅ Implemented | Score, findings, status |
| `kit_install_events` | ✅ Implemented | Target tracking |
| `kit_view_events` | ❌ **Not implemented** | No page-view tracking anywhere |
| `learnings` | ✅ Implemented | JSONB context (os/model/runtime/platform) |
| `kit_required_resources` | ⚠️ Partially | Stored as JSONB on `kits.resourceBindings` instead of separate table |
| `skills` | ✅ Implemented | Extra table beyond original plan — extends the product to "Skills" |
| `skill_tags` | ✅ Implemented | |
| `notification_logs` | ✅ Implemented | Deduplication window for install/learning notifications |

**3 Drizzle migrations exist** (`0000`, `0001`, `0002`), indicating the schema has been pushed to Supabase.

> [!IMPORTANT]
> **`kit_view_events` is completely missing.** The plan calls for analytics dashboards that include view counts — no tracking infrastructure exists for this.

---

### B. API Routes (Fastify backend at `apps/api/`)

| Planned Endpoint | Status | Implementation |
|---|---|---|
| `GET /api/kits` (browse/search) | ✅ Implemented | Full-text search, tag filtering, sort, pagination |
| `GET /api/kits/:slug` | ✅ Implemented | Enriched with publisher, releases, scans, learnings count |
| `GET /api/kits/:slug/history` | ⚠️ **Renamed** | Implemented as `GET /api/kits/:slug/versions` |
| `GET /api/kits/:slug/install?target=` | ✅ Implemented | Target validation, 400 on missing target, install event tracking |
| `GET /.well-known/agent-kit.json` | ❌ **Not implemented** | |
| `GET /api/install-targets` | ❌ **Not implemented** | (Available via MCP server tool, but not as REST) |
| `POST /api/auth/register` | ⚠️ Returns **410 Gone** in production | Deliberately retired — Supabase OTP replaces this |
| `POST /api/auth/request-verification` | ❌ Not implemented | Not needed — Supabase handles this |
| `POST /api/auth/verify-email` | ⚠️ Returns **410 Gone** in production | Same as register |
| `POST /api/auth/login` | ⚠️ Returns **410 Gone** in production | Same |
| `POST /api/auth/logout` | ✅ Implemented | Returns guidance to sign out via Supabase client |
| `GET /api/auth/config` | ✅ Implemented | **Extra** — returns Supabase URL + anon key for client-side auth |
| `GET /api/auth/me` | ✅ Implemented | Returns authenticated user identity from Supabase token |
| `GET /api/me/kits` | ⚠️ **Renamed** | Implemented as `GET /api/kits/mine` |
| `POST /api/kits` (publish) | ✅ Implemented | Full flow: parse → scan → insert/update kit + release + tags |
| `PATCH /api/kits/:slug` | ❌ **Not implemented** | Update is handled by re-publishing (POST new version) |
| `DELETE /api/kits/:slug` | ✅ Implemented | Soft-delete via `unpublishedAt` |
| `POST /api/kits/:slug/learnings` | ✅ Implemented | Context metadata + payload persisted to DB |
| `GET /api/kits/:slug/analytics` | ✅ Implemented | **Extra** — daily installs, by-target breakdown |
| `GET /api/kits/trending` | ✅ Implemented | **Extra** — top kits by install count |
| `GET /api/publishers/:slug` | ✅ Implemented | Publisher profile pages |
| `GET /api/skills` | ✅ Implemented | **Extra** — Skills registry |
| `GET /health` | ✅ Implemented | DB connectivity check |
| `/docs` (Swagger UI) | ✅ Implemented | OpenAPI auto-generated |

**Auth mechanism:** Production uses **Supabase Auth** exclusively. The API middleware intercepts `Bearer` tokens, validates them against Supabase `auth.getUser()`, and auto-creates/syncs local user + publisher profile records. Legacy email-code flows only activate in `NODE_ENV=test`.

> [!NOTE]
> The API is **Fastify** (not Express), running on Hono as noted in `package.json` overrides. Port 8080 by default. CORS allows the web URL and localhost:3000/5000.

---

### C. Frontend Pages (Next.js App Router at `apps/web/`)

| Planned Surface | Status | Notes |
|---|---|---|
| Dark-themed landing page | ✅ Implemented | Hero, agent-first quick start, CLI fallback, features grid, FAQ |
| Browse/search registry | ✅ Implemented | `/registry` — KitCard, Pagination, SortSelector components |
| Kit detail pages | ✅ Implemented | `/registry/[slug]` — full markdown viewer |
| Auth screens (register/login) | ✅ Implemented | `/auth` — Supabase OTP flow (email + code) |
| Publish flow | ✅ Implemented | `/publish` — 3-step: paste → validate → scan & publish, with edit mode |
| Personal dashboard | ✅ Implemented | `/dashboard` — kit list, stats, edit/unpublish/analytics actions |
| Skills pages | ✅ Implemented | `/skills` + `/skills/[slug]` — **Extra**, extends product |
| Publisher profiles | ✅ Implemented | `/publishers/[slug]` — **Extra** |
| FAQ | ⚠️ **In-page only** | Part of landing page, not a standalone page |
| API docs UI | ⚠️ **API-side only** | Swagger at `/docs` on the API, not on the web app |

**Shared UI components:** Nav, Toast, Skeleton, Analytics drawer, MarkdownPreview, ErrorBoundary — all present.

**CSS:** One massive `globals.css` (46KB) with a complete dark design system. Glass-panel aesthetic with terminal motifs.

---

### D. Shared Packages

#### `@kithub/schema`
| Feature | Status |
|---|---|
| `kit/1.0` frontmatter Zod schema | ✅ Complete |
| Body section parser (6 required sections) | ✅ Complete |
| Conformance level detection | ✅ Complete |
| Safety scanner (secrets, destructive patterns, schema validation) | ✅ Complete |
| Install payload generator (per-target) | ✅ Complete |

#### `@kithub/sdk`
| Feature | Status |
|---|---|
| Typed API client for all endpoints | ✅ Complete |
| Supabase OTP auth flow (register, login, verify, refresh) | ✅ Complete |
| Token management | ✅ Complete |
| `updateUserMetadata` for agentName | ✅ Complete |

#### `@kithub/cli`
| Feature | Status |
|---|---|
| `kithub search` | ✅ Implemented |
| `kithub install <slug> --target` | ✅ Implemented (with auto-detect & file writing) |
| `kithub login` | ✅ Implemented (Supabase OTP) |
| `kithub register` | ✅ Implemented |
| `kithub verify` | ✅ Implemented |
| `kithub publish [file]` | ✅ Implemented (local validate → remote publish) |
| `kithub whoami` | ✅ Implemented |
| `kithub logout` | ✅ Implemented |

#### `@kithub/mcp-server`
| Feature | Status |
|---|---|
| `search_kits` tool | ✅ **Code exists** |
| `get_kit_detail` tool | ✅ **Code exists** |
| `install_kit` tool | ✅ **Code exists** |
| `submit_learning` tool | ✅ **Code exists** |
| `list_install_targets` tool | ✅ **Code exists** |
| **Build status** | ❌ **BROKEN** — TypeScript errors prevent compilation |

> [!CAUTION]
> The MCP server **cannot be built or used**. It has 10 TypeScript errors:
> - `@modelcontextprotocol/sdk` module not found (missing dependency or types)
> - Implicit `any` types on all tool handler parameters
>
> This is a **critical blocker** for the agent-first install flow.

---

### E. Supabase Backend Integration

| Aspect | Status | Details |
|---|---|---|
| Project setup | ✅ Connected | Project ref `oqqtsijbgzorefvzrgdj` |
| Auth (Email OTP) | ✅ Working | `signInWithOtp` / `verifyOtp` in both web and SDK |
| Database connection | ✅ Configured | Via `DATABASE_URL` or `PG*` env vars with SSL |
| Schema migrations | ✅ Applied | 3 Drizzle migrations deployed |
| Server-side token validation | ✅ Working | `supabase.auth.getUser(token)` in API middleware |
| Client-side auth | ✅ Working | `@supabase/ssr` in web app |
| Row-Level Security (RLS) | ⚠️ **Unknown** | Not visible in codebase — needs Supabase dashboard check |
| Email delivery | ⚠️ Optional | SMTP_URL env var; falls back to console logging |

> [!IMPORTANT]
> The Supabase auth integration is **well-designed**. The API auto-syncs Supabase users to local `users` + `publisher_profiles` records. Publisher creation is triggered by `agentName` in Supabase user metadata.

---

### F. Vercel Deployment

| Aspect | Status | Details |
|---|---|---|
| `vercel.json` configuration | ✅ Present | Build from monorepo root, `iad1` region |
| `next.config.js` | ⚠️ Has warnings | `eslint` config deprecated in Next.js 16; standalone output configured |
| `.env.local` for web | ✅ Set | Points to live Supabase project |
| API deployment | ⚠️ **Unclear** | API runs on Fastify, not Vercel Functions — needs separate hosting |

> [!WARNING]
> **The API (`apps/api`) is a standalone Fastify server, NOT a Vercel serverless function.** The `vercel.json` only covers the web app. The API needs its own deployment target (Railway, Render, Fly.io, or a separate Vercel project with a custom server adapter).

---

## 3. Gap Analysis Summary

### ✅ Fully Implemented (matches or exceeds plan)
- Kit/1.0 schema parsing & validation
- Safety scanner (rule-based)
- Publish flow (paste → validate → scan → publish/block)
- Registry browsing with search, tag filter, sort, pagination
- Kit detail pages with markdown rendering
- Install endpoint with per-target payload generation
- Learnings submission (UI + DB persistence)
- Authentication via Supabase email OTP
- Publisher profile auto-creation
- Dashboard with kit management, analytics
- CLI with full command set (search, install, login, register, publish, whoami)
- SDK typed client
- Seeded demo data (seed scripts exist)
- Resource bindings (metadata-only, no runtime resolution)
- Notification system for installs/learnings

### ⚠️ Partially Implemented / Deviations
| Item | Gap |
|---|---|
| **MCP Server** | Code exists but **build is broken** (critical for agent-first value proposition) |
| **`GET /.well-known/agent-kit.json`** | Not implemented — planned as a discovery endpoint |
| **`GET /api/install-targets`** | Missing as REST, only in MCP tool |
| **`PATCH /api/kits/:slug`** | Not implemented — updates use re-publish |
| **View tracking** | `kit_view_events` table and tracking completely missing |
| **LLM review in scanner** | Scanner is rule-based only; no LLM review step exists |
| **API deployment** | Fastify server has no Vercel/serverless adapter — needs separate hosting |
| **`next.config.js`** | Deprecated `eslint` key causes build warnings |
| **Supabase RLS** | Unknown if database has row-level security policies |

### ❌ Not Implemented
| Item | Priority |
|---|---|
| `sessions` table (DB-level) | Low — Supabase handles sessions |
| `kit_view_events` + page view tracking | Medium |
| `/.well-known/agent-kit.json` discovery endpoint | Medium |
| LLM-powered scanner review | Low for v1 |
| SMTP email delivery (Resend/SendGrid) | Medium — codes only print to console |
| Separate API deployment pipeline | **High** |
| Comprehensive test suite | Medium — only 1 API test file + schema tests |

---

## 4. Recommended Path Forward

### Phase 1: Stabilization (Do First) 🔴

1. **Fix MCP Server Build** — Install `@modelcontextprotocol/sdk` and add proper type annotations to all tool handlers. This is the #1 blocker for the agent-first mission.

2. **Resolve API Deployment** — The Fastify API cannot run on Vercel's default Next.js hosting. Options:
   - **Option A (Recommended):** Convert API routes to Next.js App Router API routes (`apps/web/app/api/...`), eliminating the separate server entirely. All deployment stays on Vercel.
   - **Option B:** Deploy the API to a separate platform (Railway, Render, or Fly.io) and set `NEXT_PUBLIC_API_URL` to point to it.
   - **Option C:** Use `@hono/node-server` with a Vercel adapter to deploy as serverless functions.

3. **Fix Next.js build warnings** — Remove the deprecated `eslint` key from `next.config.js`.

4. **Configure Supabase email delivery** — Without SMTP, verification codes only print to the server console. Set up Resend or use Supabase's built-in email service.

### Phase 2: Missing Features (Do Next) 🟡

5. **Add `kit_view_events`** tracking — Instrument the kit detail page to record views. Add a `kitViewEvents` table and API endpoint.

6. **Add `/.well-known/agent-kit.json`** — Simple static route that returns registry metadata for agent discovery.

7. **Add `GET /api/install-targets`** — Expose the supported targets list as a REST endpoint (currently only in MCP tool code).

8. **Verify Supabase RLS policies** — Check if tables have row-level security enabled. Without RLS, the service_role key provides unrestricted access.

### Phase 3: Polish & Production Readiness 🟢

9. **Expand test coverage** — Only 1 API test file exists. Add contract tests for auth, publishing, install, and learnings endpoints.

10. **Set up monitoring** — The plan mentions Sentry. No Sentry SDK is installed anywhere.

11. **Add proper error toasts/handling** — The web app has a Toast system but error recovery UX could be improved.

12. **Seed content pipeline** — Seed scripts exist (`seed-journeykits.ts`, `seed-skills.ts`) but the curation pipeline is manual.

13. **npm CLI publication** — `@kithub/cli` needs to be published to npm for `npx @kithub/cli` to work.

---

## 5. Architecture Decision: API Consolidation

The biggest architectural decision is **what to do with the standalone Fastify API**. My recommendation:

> [!TIP]
> **Consolidate into Next.js API routes.** The current API uses Fastify but the v1 plan calls for Supabase + Vercel. Moving the API routes into `apps/web/app/api/` would:
> - Eliminate the need for a separate deployment
> - Share auth middleware with the web app
> - Simplify CORS (same origin)
> - Reduce infrastructure costs to a single Vercel project
>
> The trade-off is losing Fastify's swagger auto-generation and rate limiting plugins, but these can be replaced with Next.js middleware and libraries like `next-swagger-doc`.
>
> **If you prefer to keep the API separate**, deploy it to Railway or Render with the existing `DATABASE_URL` pointing to the same Supabase database.

---

## 6. Current Build Status

```
✅ @kithub/schema    → builds clean
✅ @kithub/db         → builds clean  
✅ @kithub/sdk        → builds clean
✅ @kithub/cli        → builds clean
✅ api                → builds clean
✅ web (Next.js)      → builds with warnings (deprecated eslint config)
❌ @kithub/mcp-server → FAILS (10 TypeScript errors)
```

**Overall assessment:** The project is ~85% complete for v1 launch. The core registry loop (browse → view → install → publish → dashboard) works end-to-end. The critical path items are MCP server fix, API deployment strategy, and email delivery setup.
