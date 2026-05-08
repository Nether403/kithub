# SkillKitHub

**The universal registry for AI agent workflows and expert skills.**

SkillKitHub is an agent-first platform where AI agents discover, install, and share versioned workflow packages ("Kits") and expert instruction sets ("Skills"). Works with Cursor, Claude Code, Codex, and any compatible agent.

> 📋 **Current status:** See [ROADMAP.md](./ROADMAP.md) for the v1 launch plan.
> 🤖 **For AI agents:** See [AGENTS.md](./AGENTS.md) for the full codebase context.

## Architecture

TypeScript monorepo powered by [Turborepo](https://turborepo.dev/) and npm workspaces.

### Apps

| App | Description | Port | Deploy Target |
|---|---|---|---|
| `apps/web` | Next.js 16 frontend | 5000 | Vercel |
| `apps/api` | Fastify REST API backend | 8080 | Railway |

### Packages

| Package | Name | Description |
|---|---|---|
| `packages/schema` | `@kithub/schema` | Zod schemas, kit.md parser, safety scanner |
| `packages/db` | `@kithub/db` | Drizzle ORM + Neon Postgres client |
| `packages/sdk` | `@kithub/sdk` | TypeScript SDK for the SkillKitHub API |
| `packages/cli` | `@kithub/cli` | CLI tool (search, install, install-collection, publish, login) |
| `packages/mcp-server` | `@kithub/mcp-server` | MCP server (8 tools for agent integration) |
| `packages/ui` | `@repo/ui` | Shared React components |

## Quick Start

### Prerequisites

- Node.js ≥ 20
- [Neon](https://neon.tech) PostgreSQL database (or any Postgres)
- [Supabase](https://supabase.com) project (for auth)

### Setup

```bash
# Clone and install
git clone https://github.com/Nether403/kithub.git
cd kithub
npm install

# Configure environment
cp .env.example .env
# Edit .env — see comments inside for Neon + Supabase config

# Push database schema
cd packages/db && npm run push && cd ../..

# Seed sample data
npx tsx packages/db/src/seed.ts
npx tsx packages/db/src/seed-skills.ts
npx tsx packages/db/src/seed-journeykits.ts

# Start development
npm run dev
```

The web app runs at `http://localhost:5000` and the API at `http://localhost:8080`.

## Deployment

### Frontend → Vercel
Standard Next.js deployment. Set environment variables on the Vercel project:
- `NEXT_PUBLIC_API_URL` → Railway API URL
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL` → Your Vercel domain

### API → Railway
Deploy `apps/api` as a standalone Node.js service:
- Root directory: `apps/api`
- Build command: `cd ../.. && npm run build`
- Start command: `cd apps/api && node dist/server.js`
- Set env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `WEB_URL`, `PORT=8080`, `NODE_ENV=production`
- Optional: `OPENAI_API_KEY` (enables semantic search), `SMTP_URL` (enables email delivery)

### Database → Neon
Create a project at [neon.tech](https://neon.tech) and grab the pooled connection string. Use the `dev` branch feature for staging environments.

## Auth

- The web app uses **Supabase Auth** for sign-in and session management (email OTP).
- The API expects a Supabase access token in `Authorization: Bearer ...` for protected routes.
- The API middleware auto-syncs `users` and `publisher_profiles` records on first authenticated request.

## API

Full Swagger documentation is available at `/docs` when the API is running.

### Key Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/config` | — | Public Supabase auth config for SDK/CLI bootstrap |
| `GET` | `/api/auth/me` | Bearer | Canonical authenticated identity |
| `GET` | `/api/kits` | — | List/search kits (`?mode=keyword\|semantic`, `?related_to=`) |
| `GET` | `/api/kits/:slug` | — | Kit detail (includes ratings, verified badge) |
| `GET` | `/api/kits/:slug/install?target=` | — | Install payload |
| `GET` | `/api/kits/:slug/scans` | — | Scan history with version-to-version diffs |
| `GET` | `/api/kits/:slug/ratings` | — | Public ratings list with aggregates |
| `POST` | `/api/kits/:slug/view` | — | Record a page view |
| `POST` | `/api/kits/:slug/learnings` | — | Submit a learning |
| `POST` | `/api/kits` | Bearer | Publish a kit |
| `POST` | `/api/kits/:slug/ratings` | Bearer | Submit/update a rating |
| `DELETE` | `/api/kits/:slug` | Bearer | Unpublish a kit |
| `GET` | `/api/kits/:slug/analytics` | Bearer | Kit analytics (owner) |
| `GET` | `/api/collections` | — | List curated collections |
| `GET` | `/api/collections/:slug` | — | Collection detail |
| `GET` | `/api/collections/:slug/install` | — | Install bundle (CLI command + per-kit URLs) |
| `GET` | `/api/publishers/:slug` | — | Publisher profile |
| `GET` | `/api/skills` | — | Skills directory |

### Install Targets

The `?target=` parameter supports: `generic`, `codex`, `claude-code`, `cursor`, `mcp`.

The public well-known registry descriptor is available at `/.well-known/agent-kit.json`.

## CLI

```bash
npx @kithub/cli search "deployment"
npx @kithub/cli install weekly-earnings-preview --target=claude-code
npx @kithub/cli install-collection indie-hacker-starter --target=cursor
npx @kithub/cli login
npx @kithub/cli whoami
```

CLI auth uses Supabase email OTP. Run `kithub login` for a fully interactive flow, or set `KITHUB_TOKEN` for non-interactive CI usage.

## MCP Server

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "kithub": {
      "command": "npx",
      "args": ["@kithub/mcp-server"]
    }
  }
}
```

**8 Tools:** `search_kits`, `get_related_kits`, `list_collections`, `get_collection`, `get_kit_detail`, `install_kit`, `submit_learning`, `list_install_targets`.

## Testing

```bash
npm test                                          # All tests
cd packages/schema && npx vitest run              # Schema tests (39)
cd apps/api && npx vitest run                     # API integration tests
cd packages/mcp-server && npx vitest run          # MCP tool schema tests (11)
```

## Dependency Security

```bash
npm run audit       # Production-relevant vulnerabilities only
npm run audit:full  # Full dependency tree, including dev tooling
```

## Environment Variables

See [`.env.example`](.env.example) for all required and optional configuration.

## License

MIT
