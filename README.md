# Affiliate Platform

A portfolio build of an affiliate-marketing back office: affiliate self-service
(referral links, conversions, payouts, analytics) plus an admin/super-admin console
(affiliate approval, sites, commission plans, payments, reports). Originally a Next.js
App Router product wired to a real Node/Postgres backend — see `UPSTREAM.md`.

**Demo — sample data, no backend.** Every screen runs on a deterministic, seeded
in-memory dataset. There is no live API: `mock/install.ts` intercepts `fetch` itself
(browser-only) and answers with the exact response envelope the real backend used, so the
UI code — retries, token refresh, request caching, loading skeletons — is exercised for
real, just against data that lives entirely in this tab.

## Try it

The demo auto-signs you in as an affiliate on first load — no password wall. Use the
role switcher in the bottom-left badge to jump between the three role areas:

- **Affiliate** — referral links, conversions, payouts, analytics, contact requests.
- **Admin** — affiliate approval, sites, conversions, payments, payouts, reports.
- **Super Admin** — everything Admin has, plus commission plans, plan/site assignments,
  and settings.

**Reset demo data** in the same badge wipes any edits you've made this session and
rebuilds fresh from the seed. The real login screens (`/login`, `/admin/login`) are also
reachable directly, prefilled with the matching demo credentials.

## What's real

- The full Next.js App Router UI: 40 routes across the affiliate area, the admin/
  super-admin dashboard, and the shared auth flows.
- `lib/api/client.ts` — token refresh, request de-duplication/caching, session
  versioning, rate-limit and error handling all run against the mock exactly as they
  would against the real API.
- Every mutation genuinely persists for the session: approving an affiliate, requesting
  a payout, editing a referral code label, updating settings — all of it sticks until you
  hit Reset (mirrored to `sessionStorage`, so a page refresh doesn't lose it either).

## What's mocked / synthetic

- **`mock/seed.ts`** — a deterministic, seeded generator (mulberry32 PRNG, never
  `Math.random` for data) that builds 14 invented affiliates, 3 invented merchant sites,
  4 commission plans, ~185 conversions spread across 13 months, their commission
  payments, and the payout requests derived from them.
- **The money reconciles by construction**, which is the point of this case study:
  `commissionAmount = purchaseAmount × the plan rate actually assigned to that affiliate`
  (custom overrides included); `totalEarned` is the sum of an affiliate's approved
  conversions; `totalPaidOut` is the sum of their completed payments; `pendingBalance =
  totalEarned − totalPaidOut`. Every dashboard total, detail-page stat, and analytics
  breakdown is computed from that same conversion list rather than invented separately —
  see `mock/db.ts` and `mock/analytics.ts`.
- **Analytics breakdowns** (referrer / OS / browser / country / device) are aggregated
  straight from the conversion rows, so they always sum to the same click and conversion
  totals as each other. Trend charts have 400 days of daily points.
- **Affiliates, merchants, domains, customer emails** are all invented — no real company
  or person from the source project appears anywhere in this repo.

## Run it

```sh
bun install
bun run dev       # http://localhost:3000
```

```sh
bun run build     # next build
bun run start     # serve the production build
```

No environment variables are required — see `.env.example` for what's read and why none
of it points anywhere real.

## Deploy

Vercel — `vercel.json` is already configured (Next.js framework preset). Connect the
repo in the Vercel dashboard; no environment variables are needed.

**Live URL:** not yet deployed — will be added here once connected.

## Repo layout

```
app/                one route group per role area: (affiliate)/, admin/(dashboard)/,
                    plus the shared login/register/reset-password flows
components/         upstream UI, organized by feature
components/demo/    demo-only: the badge, role switcher, and reset control
lib/api/            the 22 upstream services + the shared client/config/errors —
                    byte-identical to upstream, unaware it's talking to a mock
mock/               the mock server: install.ts (fetch patch), router.ts, db.ts,
                    seed.ts, analytics.ts, session.ts, auto-auth.ts, handlers/*.ts
                    (one per lib/api/ service)
```

## Source

Extracted from a real (unnamed, per the portfolio) client project. See `UPSTREAM.md` for
the exact source commit, what was cut, and how to pull a future UI update
(`scripts/sync-ui.sh`).
