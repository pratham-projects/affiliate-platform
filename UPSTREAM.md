# Upstream

This repo is a frontend-only extraction of the **Affiliate Platform**, a real client
product. It is packaged for a portfolio, not maintained as a product.

- **Source:** `PrathamBhavsar/affiliate-system` (private) @ `main`.
- **Synced commit:** `7cc6bf23e4cd40fdb7b9d19a6856c906e412bffa` — "feat: analytics map, insights
  panel, and view-model refinements".
- **Subtree taken:** the whole repo root (it's a Next.js App Router app, not a subdirectory
  like the other two demos in this set).
- **Protected paths — sync must never overwrite these:** `mock/`, `components/demo/`,
  `README.md`, `UPSTREAM.md`, `scripts/`, `vercel.json`, `.env.example`.

## What was cut from upstream

- `app/api/v1/webhooks/conversions/route.ts` — a real backend webhook receiver (a Next.js
  Route Handler that would have run server-side). Has no place in a frontend-only demo;
  the "test webhook" tool on the site detail page is instead handled by the mock
  (`POST /webhooks/conversions` in `mock/handlers/sites.ts`), which just accepts the test
  payload and reports success without creating anything.
- `app/test/` — internal dev tooling (a webhook tester page), not part of the product.
- `docs/`, `CLAUDE.md` — internal project docs, not for a public repo.
- `.DS_Store` files.
- `app/simplemessage/` — a one-off health-check page ("System Check / Perfect") with no
  product value; dropped as scratch.

## What changed from upstream (beyond pure additions)

Every upstream file is otherwise byte-identical. Two files were edited rather than left
untouched, both required by the demo brief (§6 of the build plan) rather than a UI change:

- **`app/layout.tsx`** — two lines added: mounting `<MockMount />` (installs the mock
  fetch patch + auto-login, module-scope, before any child effect fires) and
  `<DemoBadge />` (the role switcher + reset control) inside the existing provider tree.
- **`components/auth/login-page-content.tsx`** — the email/password fields are
  pre-filled with the demo account for that login type, and a "Sign in as demo" button
  was added below the real submit button. The real form, real `authService.login()` call,
  and real validation are untouched — a visitor can still type different credentials and
  submit normally (the mock's `/auth/login` handler will accept any of the three seeded
  demo accounts; see `mock/seed.ts`).

Everything else additive: `mock/`, `components/demo/`, `README.md`, `UPSTREAM.md`,
`vercel.json`, `.env.example`, `scripts/sync-ui.sh`.

## How the mock layer works

See `mock/install.ts` for the full mechanism. In short: `installMockApi()` patches
`globalThis.fetch` once, browser-only, matching only requests to `NEXT_PUBLIC_API_BASE_URL`
and returning real `Response` objects in the upstream envelope
(`{ status, data, pagination, message }`, see `lib/api/config.ts`). `lib/api/client.ts` —
retries, token refresh, request cache, session versioning — all still run for real against
those responses; only the actual network socket is replaced. Data lives in
`mock/db.ts` (in-memory, seeded once per page load from `mock/seed.ts`, mirrored to
`sessionStorage` so a refresh doesn't lose session edits) and `mock/handlers/*.ts` (one
file per upstream service in `lib/api/`).

All 22 services in `lib/api/` are covered: auth, dashboard, affiliates, sites, links,
referral-codes, conversions, conversion-types, payments, payouts, plans, assignments,
reports, analytics, settings, notifications, contact.

**Server components:** none exist. Every `page.tsx` and `layout.tsx` in this app is a
Client Component (`"use client"` at the top) — grepped and confirmed during the build of
this repo. The fetch-patch approach has no gaps to cover.

## Syncing a future UI change

```sh
scripts/sync-ui.sh
```

This adds `PrathamBhavsar/affiliate-system` as the git remote `upstream` (if not already
present), fetches it, and diffs `app components lib hooks styles public` between the
last-synced sha (recorded above) and `upstream/main`, applying the result here with
`git apply --3way`. It never touches the protected paths listed above because the diff is
scoped to those directories, but always review the diff before committing — a renamed or
moved upstream file can still collide.

After a successful sync:

1. Extend `mock/seed.ts` and `mock/handlers/*.ts` if the new UI needs data or an endpoint
   that doesn't exist yet in the mock. Never point a new screen at a real endpoint.
2. Bump the synced sha at the top of this file.
3. `bun install && bun run build`.
4. Re-run the scrub checklist (client names, API hosts, secrets, fresh history, network
   tab silent).
5. Commit and push.
