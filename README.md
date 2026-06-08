# Forum

A community forum (Reddit-style, lighter) built with **Next.js 16 (App Router)**, **Postgres + Prisma 7**, and native **i18n (English + Georgian)**.

See [REQUIREMENTS.md](REQUIREMENTS.md) for the full product spec.

> **Working with Next.js 16:** this version has breaking changes vs. older docs (e.g. `middleware` → `proxy`, async `params`, `PageProps`/`LayoutProps` global helpers). The version-matched docs are bundled at `node_modules/next/dist/docs/` — read them before changing framework behavior (see `AGENTS.md`).

## Stack

- **Next.js 16** App Router, React 19, TypeScript, Tailwind v4
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter (Postgres)
- **Auth:** custom session (signed JWT via `jose`) in an HttpOnly cookie, `bcryptjs` password hashing, Zod validation. Roles: `USER`, `MODERATOR`, `ADMIN` (guests are unauthenticated).
- **i18n:** `app/[lang]/` segment + JSON dictionaries (`src/i18n/dictionaries/{en,ka}.json`), locale negotiation in `src/proxy.ts`.

## Project layout

```
src/
  proxy.ts                 # locale detection/redirect (Next 16 "middleware")
  i18n/                    # locale config + dictionaries + localize helpers
  lib/                     # db (Prisma), session, dal (auth), definitions (zod), forum-data
  app/
    [lang]/
      layout.tsx           # root layout (html/body, per-locale)
      page.tsx             # home (header, sidebars, top panel, feed)
      login/ signup/       # auth pages
      admin/               # admin panel shell (ADMIN-only): dashboard, categories,
                           #   ad-cards, users, hidden content
    actions/auth.ts        # signup / login / logout server actions
  components/              # Header, sidebars, Feed, forms, AdminNav, LanguageSwitcher
prisma/
  schema.prisma            # data model
  seed.ts                  # seeds the 9 spec categories (+ optional admin)
```

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — your Postgres connection string
   - `SESSION_SECRET` — `openssl rand -base64 32`
   - (optional) `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to bootstrap an admin

3. **Set up the database**
   ```bash
   npm run db:migrate   # create + apply the initial migration
   npm run db:seed      # seed categories (and admin if env vars set)
   ```

4. **Run**
   ```bash
   npm run dev          # http://localhost:3000  (redirects to /en)
   ```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build + typecheck |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:seed` | Seed categories / admin |
| `npm run db:studio` | Open Prisma Studio |

## Status

Foundation scaffold in place: i18n routing, data model, auth + roles, home layout, and admin shell. Next up: rich-text post creation, category/post pages, threaded replies + voting, moderation actions, and full admin CRUD. Marketplace + Stripe Connect are future work (see spec).
