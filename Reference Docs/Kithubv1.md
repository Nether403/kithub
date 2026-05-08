# KitHub v1 Plan

## Summary
- Build KitHub as a split-service TypeScript product with separate web and API deployments, a PostgreSQL core, a real npm CLI, and an MCP server for agent discovery/install.
- Optimize v1 for solo publishers and public kit consumption: registry browsing, kit detail/install, email-verified publishing, personal dashboard, persisted learnings submissions, and pointer-only resource binding metadata.
- Use a dark infrastructure visual direction: full-bleed hero, strong brand-first typography, restrained terminal/grid motifs, sparse copy, and clear separation between agent-first install prompts and legacy CLI instructions.

## Implementation Changes
- Web app: `Next.js` app on Vercel for landing page, browse/search, kit detail pages, auth screens, publish flow, dashboard, FAQ, and API docs UI.
- API service: `Fastify` app on a managed Node host with OpenAPI output, auth, kit CRUD/releases, install payload generation, learnings submission, analytics, and scanner orchestration.
- Shared packages: `@kithub/schema` for `kit/1.0` parsing and Zod validation, `@kithub/db` for Drizzle schema/migrations, `@kithub/sdk` for typed API client, `@kithub/cli` for npm distribution, and `@kithub/mcp-server` for MCP tools.
- Data model in PostgreSQL: `users`, `email_verification_codes`, `sessions`, `publisher_profiles`, `kits`, `kit_releases`, `kit_tags`, `kit_release_scans`, `kit_install_events`, `kit_view_events`, `learnings`, and `kit_required_resources`.
- Search and filtering: PostgreSQL full-text search over title/summary/body plus trigram matching on slug/tags; browse supports query, tags, sort by newest/popular, and setup complexity badges.
- Publishing flow: paste `kit.md`, edit normalized metadata, validate against `kit/1.0`, run scanner job, then auto-publish on pass or block with actionable findings.
- Safety scanner: hard-rule checks for secrets, destructive shell/file patterns, invalid schema/section order, and unsafe links; LLM review adds safety/completeness/setup scores and human-readable review notes.
- Learnings: real submission form persisted to DB; no public learnings ranking/discovery UI in v1 beyond showing submission success and basic per-kit count if available.
- Resource bindings: kits can declare required resources and delivery methods in metadata; runtime secret resolution is not implemented beyond exposing these pointers via API/MCP.
- Seed content: import a reviewed subset of Journey crawl examples into a private seed pipeline, then manually approve only curated demo kits for launch.

## Public APIs / Interfaces
- Canonical public read APIs:
  - `GET /api/kits`
  - `GET /api/kits/:slug`
  - `GET /api/kits/:slug/history`
  - `GET /api/kits/:slug/install?target={generic|mcp|codex|claude-code}`
  - `GET /.well-known/agent-kit.json`
  - `GET /api/install-targets`
- Auth and publisher APIs:
  - `POST /api/auth/register`
  - `POST /api/auth/request-verification`
  - `POST /api/auth/verify-email`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/me/kits`
  - `POST /api/kits`
  - `PATCH /api/kits/:slug`
  - `POST /api/kits/:slug/learnings`
- CLI package: publish `@kithub/cli` with `kithub search`, `kithub install <slug> --target <target>`, `kithub login`, and `kithub whoami`.
- MCP server tools: `search_kits`, `get_kit`, `install_kit`, `list_install_targets`, and `submit_learning`.
- Install behavior:
  - `generic`: return bundle metadata, normalized `kit.md`, preflight checks, and plain instructions.
  - `codex`: generate install steps and local output for `AGENTS.md` plus a stored raw kit copy under a `.kithub/` workspace folder.
  - `claude-code`: same pattern targeting `CLAUDE.md`.
  - `mcp`: return MCP-oriented instruction payload and resource requirements.

## Test Plan
- Unit tests for frontmatter parsing, section-order validation, slug uniqueness, tag extraction, install payload generation, and scanner rule matching.
- API contract tests for browse/search, auth and email verification, publish-and-scan flow, release history, install endpoint, and learning submission.
- E2E tests for: register -> verify -> login -> publish -> auto-publish -> browse -> open detail -> install via target -> see dashboard analytics.
- CLI smoke tests for search, login, install, and whoami against a staging API.
- MCP smoke tests for search/get/install on a staged seeded kit.
- Non-functional checks: rate limiting on auth/publish endpoints, sanitized markdown rendering, Sentry error capture, and basic product analytics for views/install conversions.

## Assumptions And Defaults
- V1 keeps slugs globally unique so `GET /api/kits/:slug` is canonical; owner pages can be added later without changing install URLs.
- V1 stores and installs markdown-first kits; `src` bundle artifact uploads are not part of the launch publish UI, but the release schema leaves room for them later.
- Managed cloud defaults: Vercel for web, Supabase Postgres, Resend for email, Postgres-backed job queue for scan/verification jobs, and Sentry for monitoring.
- Auth is email/password only; no social login in v1.
- Enterprise orgs, RBAC, audit logs, hosted-mode resolution, and real runtime credential issuance are phase 2, not launch requirements.