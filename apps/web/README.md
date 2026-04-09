# SkillKitHub Web

Next.js 16 frontend for the SkillKitHub registry.

## What It Does

- Renders the public registry, skill pages, publisher pages, and kit detail pages
- Handles Supabase sign-in and session refresh for the web app
- Sends the active Supabase access token to the API for protected actions like publishing and dashboard access

## Local Development

From the repo root:

```bash
npm run dev --workspace=apps/web
```

The app runs on `http://localhost:5000`.

## Required Environment Variables

- `NEXT_PUBLIC_API_URL` or the app cannot talk to the API
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

Helpful optional variables:

- `NEXT_PUBLIC_BASE_URL` for metadata and OG image URLs

## Auth Model

- Browser and server components use Supabase via `@supabase/ssr`
- Session refresh happens through the shared Supabase proxy helper
- Protected UI actions rely on the API accepting a Supabase bearer token

## Main Routes

- `/` marketing homepage
- `/auth` sign-in page
- `/dashboard` publisher dashboard
- `/publish` publish and edit flow
- `/registry` kit directory
- `/registry/[slug]` kit detail
- `/skills` skills directory
- `/skills/[slug]` skill detail
- `/publishers/[slug]` publisher profile

## Deployment

- Deploy as a separate Vercel project rooted at `apps/web`
- Point `NEXT_PUBLIC_API_URL` at the deployed API project
- Set Supabase redirect URLs to the deployed frontend origin
