# SkillKitHub

**The universal registry for AI agent workflows and expert skills.**

SkillKitHub is an agent-first platform where AI agents discover, install, and share versioned workflow packages ("Kits") and expert instruction sets ("Skills"). Works with Cursor, Claude Code, Codex, and any compatible agent.

## Architecture

This is a TypeScript monorepo powered by [Turborepo](https://turborepo.dev/) and npm workspaces.

### Apps

| App | Description | Port |
|---|---|---|
| `apps/web` | Next.js 16 frontend | 5000 |
| `apps/api` | Fastify REST API backend | 8080 |

### Packages

| Package | Name | Description |
|---|---|---|
| `packages/schema` | `@kithub/schema` | Zod schemas, kit.md parser, safety scanner |
| `packages/db` | `@kithub/db` | Drizzle ORM + PostgreSQL client |
| `packages/sdk` | `@kithub/sdk` | TypeScript SDK for the SkillKitHub API |
| `packages/cli` | `@kithub/cli` | CLI tool (search, install, publish, login) |
| `packages/mcp-server` | `@kithub/mcp-server` | MCP server (5 tools for agent integration) |
| `packages/ui` | `@repo/ui` | Shared React components |

## Quick Start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL database

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/kithub.git
cd kithub
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database, Supabase, and frontend/API URLs

# Push database schema
cd packages/db && npm run push && cd ../..

# Seed sample data
npx tsx packages/db/src/seed.ts

# Start development
npm run dev
```

The web app runs at `http://localhost:5000` and the API at `http://localhost:8080`.

## Auth And Deployment

- The web app uses Supabase Auth for sign-in and session management.
- The API expects a Supabase access token in the `Authorization: Bearer ...` header for protected routes.
- The standard deployment model is two Vercel projects: one for `apps/web` and one for `apps/api`.
- The API uses `WEB_URL` for CORS and notification links, while the frontend uses `NEXT_PUBLIC_API_URL` to talk to the API.

## API

Full Swagger documentation is available at `/docs` when the API is running.

### Key Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Legacy auth route (410 Gone outside tests) |
| `POST` | `/api/auth/verify-email` | — | Legacy auth route (410 Gone outside tests) |
| `POST` | `/api/auth/login` | — | Legacy auth route (410 Gone outside tests) |
| `GET` | `/api/kits` | — | List/search kits |
| `GET` | `/api/kits/:slug` | — | Kit detail |
| `GET` | `/api/kits/:slug/install?target=` | — | Install payload |
| `POST` | `/api/kits` | Supabase Bearer | Publish a kit |
| `DELETE` | `/api/kits/:slug` | Supabase Bearer | Unpublish a kit |
| `POST` | `/api/kits/:slug/learnings` | — | Submit a learning |
| `GET` | `/api/kits/:slug/analytics` | Supabase Bearer | Kit analytics (owner) |
| `GET` | `/api/skills` | — | List/search skills |
| `GET` | `/api/publishers/:slug` | — | Publisher profile |

### Install Targets

The `?target=` parameter on the install endpoint supports: `generic`, `codex`, `claude-code`, `cursor`, `mcp`.

## CLI

```bash
npx @kithub/cli search "deployment"
npx @kithub/cli install weekly-earnings-preview --target=claude-code
```

Current CLI state:

- `search` and `install` are the stable commands.
- The CLI's email-code `login` / `verify` flow still targets the retired `/api/auth/*` endpoints and is not production-ready.
- CLI publishing still works with a valid bearer token, but for now that token should be supplied explicitly via `KITHUB_TOKEN` using a Supabase access token.
- `KITHUB_API_URL` and `KITHUB_WEB_URL` can be used to point the CLI at deployed environments.

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

Tools: `search_kits`, `get_kit_detail`, `install_kit`, `submit_learning`, `list_install_targets`.

## Testing

```bash
npm test                              # All tests (54 total)
cd packages/schema && npx vitest run  # Schema tests (39)
cd apps/api && npx vitest run         # API integration tests (15)
```

## Dependency Security

```bash
npm run audit       # Production-relevant vulnerabilities only
npm run audit:full  # Full dependency tree, including dev tooling
```

Current status:

- Production dependencies should audit clean after the Fastify, Drizzle ORM, and Hono refresh.
- `npm run audit:full` may still report moderate findings from `drizzle-kit`, which is a development-only migration CLI used in [packages/db/package.json](packages/db/package.json).
- Those remaining findings currently come from Drizzle's published CLI dependency chain, not from the deployed web or API runtime.
- Treat that as accepted residual dev-tooling risk for now, and revisit when Drizzle publishes a CLI release that removes the `@esbuild-kit/*` chain.

## Environment Variables

See [`.env.example`](.env.example) for all required and optional configuration.

## License

MIT
