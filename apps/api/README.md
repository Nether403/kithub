# SkillKitHub API

Fastify API for the SkillKitHub registry.

## What It Does

- Serves the registry, publishing, install, analytics, and publisher endpoints
- Verifies Supabase bearer tokens for protected publisher actions
- Talks directly to Supabase Postgres through the shared `@kithub/db` package

## Local Development

From the repo root:

```bash
npm run dev --workspace=apps/api
```

The API runs on `http://localhost:8080`.

## Required Environment Variables

- `DATABASE_URL` using the Supabase session pooler connection string
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `WEB_URL` for CORS and publisher notification links

Helpful optional variables:

- `PORT` to override the default `8080`
- `SMTP_URL` and `EMAIL_FROM` for outbound email delivery

## Vercel Deployment

- Deploy as a separate Vercel project rooted at `apps/api`
- Keep the framework preset aligned with the live project (`fastify`)
- Use the in-repo [`vercel.json`](./vercel.json) to install from the monorepo root and build the API workspace with its shared package dependencies
- Set `WEB_URL` to the deployed frontend origin and keep the web project `NEXT_PUBLIC_API_URL` pointed at this API deployment
- Use the Supabase session pooler `DATABASE_URL` for the Vercel environment

## Public Endpoints Added For Stabilization

- `GET /api/install-targets`
- `POST /api/kits/:slug/view`
- `GET /api/kits/:slug/analytics` now includes view metrics
