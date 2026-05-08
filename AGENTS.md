# AGENTS.md — SkillKitHub

> Agent instruction file for AI agents working on this codebase.
> Applies to: Codex, Jules, Claude Code, Cursor, Antigravity, and any compatible agent.

---

## Project Identity

**SkillKitHub** is the universal registry for AI agent workflows ("Kits") and expert instruction sets ("Skills"). Think "npm for AI agents" — agents discover, install, and share versioned workflow packages.

- **Website:** [skillkithub.com](https://skillkithub.com) (Vercel)
- **API:** Deployed on Railway (Fastify server)
- **Database:** Neon (serverless Postgres)
- **Auth:** Supabase (email OTP)

---

## Architecture

This is a TypeScript monorepo powered by Turborepo and npm workspaces.

### Apps

| App | Location | Stack | Port |
|---|---|---|---|
| Web frontend | `apps/web/` | Next.js 16 (App Router) | 5000 |
| REST API | `apps/api/` | Fastify + Drizzle ORM | 8080 |

### Packages

| Package | Name | Purpose |
|---|---|---|
| `packages/schema` | `@kithub/schema` | Zod schemas, kit.md parser, safety scanner, install payload generator |
| `packages/db` | `@kithub/db` | Drizzle ORM schema + query layer, embeddings, discovery, ratings, collections |
| `packages/sdk` | `@kithub/sdk` | TypeScript API client with Supabase auth integration |
| `packages/cli` | `@kithub/cli` | CLI: search, install, install-collection, publish, login, register, verify, whoami, logout |
| `packages/mcp-server` | `@kithub/mcp-server` | MCP server with 8 tools for agent integration |
| `packages/ui` | `@repo/ui` | Shared React components (scaffold) |

### Build Order
Shared packages must build before apps:
1. `@kithub/schema` and `@kithub/db` (independent)
2. `@kithub/sdk` (depends on schema)
3. `apps/api` and `apps/web` (depend on all packages above)

---

## Key Files

| File | Purpose |
|---|---|
| `ROADMAP.md` | Official v1 launch roadmap — **read this first when planning work** |
| `README.md` | Setup, API reference, CLI docs |
| `.env.example` | All environment variables with comments |
| `packages/db/src/schema.ts` | Database schema (source of truth) |
| `packages/db/src/index.ts` | All query functions (enrichment, batch, analytics) |
| `packages/db/src/discovery.ts` | Semantic search, ratings, collections, scan diffs |
| `packages/db/src/embeddings.ts` | OpenAI embedding generation + cosine similarity |
| `apps/api/src/server.ts` | API server entry point |
| `apps/api/src/routes/kits.ts` | Kit CRUD, search, install, learnings, analytics, scans |
| `apps/api/src/routes/ratings.ts` | Star ratings and reviews |
| `apps/api/src/routes/collections.ts` | Curated collections with install bundles |
| `apps/api/src/middleware/auth.ts` | Supabase JWT validation + auto-sync |
| `apps/web/app/globals.css` | Design system (~2200 lines, dark theme, glass-panel aesthetic) |

---

## Database Schema

The database uses Drizzle ORM with Neon Postgres. Key tables:

| Table | Purpose |
|---|---|
| `users` | User accounts, linked via `supabase_user_id` |
| `publisher_profiles` | Publisher identity (`agent_name`), verification status |
| `kits` | Kit registry entries, soft-delete via `unpublished_at` |
| `kit_releases` | Versioned releases with raw markdown + parsed frontmatter |
| `kit_tags` | Many-to-many kit ↔ tag |
| `kit_release_scans` | Safety scan results per release |
| `kit_install_events` | Install analytics (per target) |
| `kit_view_events` | Page view analytics |
| `learnings` | Community-submitted solutions with env context (os/model/runtime/platform) |
| `kit_ratings` | 1–5 star ratings with optional review body |
| `kit_embeddings` | JSONB vector storage for semantic search (no pgvector) |
| `collections` | Curated kit bundles with display order |
| `skills` | Expert instruction sets (separate from kits) |
| `notification_logs` | Deduplication for publisher email notifications |

---

## API Endpoints

Full Swagger docs available at `/docs` on the running API.

### Public
- `GET /api/kits` — Search kits (`?q=`, `?tag=`, `?sort=`, `?mode=keyword|semantic`, `?related_to=`)
- `GET /api/kits/trending` — Top kits by installs
- `GET /api/kits/:slug` — Kit detail (includes `averageStars`, `ratingCount`, `publisherVerified`)
- `GET /api/kits/:slug/versions` — Version history
- `GET /api/kits/:slug/scans` — Scan history with diffs (`?base=v&head=v` for targeted diff)
- `GET /api/kits/:slug/install?target=` — Install payload
- `GET /api/kits/:slug/ratings` — Public ratings list with aggregate stats
- `POST /api/kits/:slug/learnings` — Submit a learning
- `POST /api/kits/:slug/view` — Record a page view (fire-and-forget)
- `GET /api/publishers/:slug` — Publisher profile
- `GET /api/skills` — Skills directory
- `GET /api/collections` — List curated collections
- `GET /api/collections/:slug` — Collection detail
- `GET /api/collections/:slug/install` — Install bundle (CLI command + per-kit URLs)
- `GET /api/auth/config` — Public Supabase auth config
- `GET /health` — Health check

### Authenticated (Supabase Bearer token)
- `GET /api/auth/me` — Current user identity
- `GET /api/kits/mine` — Publisher's own kits
- `POST /api/kits` — Publish/update a kit
- `DELETE /api/kits/:slug` — Unpublish a kit
- `POST /api/kits/:slug/ratings` — Submit/update a rating (cannot rate own kit)
- `GET /api/kits/:slug/analytics` — Kit analytics (owner only)

---

## MCP Server Tools

The `@kithub/mcp-server` package exposes 8 tools:

1. `search_kits` — Keyword or semantic search across the registry
2. `get_related_kits` — Find similar kits via embeddings (tag fallback)
3. `list_collections` — List curated collection bundles
4. `get_collection` — Collection detail with optional install payload
5. `get_kit_detail` — Full kit details including scan results
6. `install_kit` — Target-specific install instructions
7. `submit_learning` — Submit community solutions/learnings
8. `list_install_targets` — Supported agent harnesses

---

## Design System

- **Theme:** Dark (`#030304` bg), green accent (`#00e88f`), violet (`#7c5cff`), cyan (`#22d3ee`)
- **Fonts:** Inter (sans), JetBrains Mono (mono)
- **Aesthetic:** Glass-panel, terminal motifs, ambient color washes
- **All tokens:** `apps/web/app/globals.css`
- **Reduced motion:** Respects `prefers-reduced-motion: reduce`

---

## Testing

```bash
npm test                    # All tests via Turborepo
cd packages/schema && npx vitest run  # Schema tests (39)
cd apps/api && npx vitest run         # API integration tests (15+)
cd packages/mcp-server && npx vitest run  # MCP schema tests (11)
```

---

## Development Workflow

```bash
# Install dependencies
npm install

# Start both apps in dev mode
npm run dev

# Build all packages + apps
npm run build

# Type check
npm run check-types

# Database operations
cd packages/db
npm run push          # Push schema to database (dev)
npm run generate      # Generate migration files
npm run migrate       # Apply migrations
```

---

## Environment Variables

See `.env.example` for full documentation. Key variables:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase URL for web app |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase browser key |
| `NEXT_PUBLIC_API_URL` | Yes | API base URL (Railway in production) |
| `WEB_URL` | Yes | Web app URL (for CORS + email links) |
| `OPENAI_API_KEY` | Optional | Enables semantic search + embeddings |
| `SMTP_URL` | Optional | Email delivery (Resend/SendGrid) |

---

## Conventions

- **Package manager:** npm (not pnpm or yarn)
- **Task runner:** Turborepo (`turbo.json`)
- **Error responses:** `{ error: "Type", message: "Description", statusCode: N }`
- **Auth:** Supabase email OTP in production; legacy email-code flow only in `NODE_ENV=test`
- **Soft deletes:** Kits use `unpublished_at` timestamp, never hard-deleted
- **Embeddings:** Optional, gated by `OPENAI_API_KEY` env var — falls back to keyword/tag matching
- **Rate limiting:** Per-route via `@fastify/rate-limit` (publish: 10/min, ratings: 10/min)
