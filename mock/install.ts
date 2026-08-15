// installMockApi() patches globalThis.fetch once, browser-only, so every
// upstream file (services, client.ts, auth-context) keeps running exactly as
// written — retries, refresh, request-cache and session-version logic all
// still execute against a real Response object, just one that's served from
// an in-memory seeded database instead of a network socket.

import { API_BASE_URL } from "@/lib/api/config"
import { dispatch } from "./router"
import { Rng } from "./rng"

// Side-effect imports: each handler module registers its routes on import.
import "./handlers/auth"
import "./handlers/dashboard"
import "./handlers/affiliates"
import "./handlers/sites"
import "./handlers/links"
import "./handlers/referral-codes"
import "./handlers/conversion-types"
import "./handlers/conversions"
import "./handlers/plans"
import "./handlers/assignments"
import "./handlers/payments"
import "./handlers/payouts"
import "./handlers/settings"
import "./handlers/notifications"
import "./handlers/contact"
import "./handlers/reports"

let installed = false
const latencyRng = new Rng(Date.now() & 0xffffffff)

function isDemoEnabled(): boolean {
  // Default ON: unset NEXT_PUBLIC_DEMO behaves the same as '1'. Only an
  // explicit '0' turns the mock off (e.g. if this repo is ever pointed at a
  // real backend for local development).
  return process.env.NEXT_PUBLIC_DEMO !== "0"
}

export function installMockApi() {
  if (installed) return
  if (typeof window === "undefined") return
  if (!isDemoEnabled()) return
  installed = true

  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url
    const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? (input as Request).method : "GET") || "GET").toUpperCase()

    if (!url.startsWith(API_BASE_URL)) {
      return nativeFetch(input, init)
    }

    const path = url.slice(API_BASE_URL.length) // e.g. "/auth/login?x=1"
    const authHeader =
      (init?.headers && (init.headers as Record<string, string>)["Authorization"]) ||
      (init?.headers instanceof Headers ? init.headers.get("Authorization") : null)

    let body: any = undefined
    if (init?.body) {
      try {
        body = JSON.parse(init.body as string)
      } catch {
        body = undefined
      }
    }

    // Seeded 120-350ms latency so loading skeletons are actually visible —
    // this is a UI demo and that's part of what's being shown.
    const delay = 120 + Math.floor(latencyRng.float() * 230)
    await new Promise((resolve) => setTimeout(resolve, delay))

    const result = await dispatch(method, path, { body, authHeader: authHeader || null })

    if (!result) {
      // Unmatched route under our own API base — fail closed with a clear
      // 404 rather than silently falling through to a native network call
      // that would hit a non-existent backend.
      return new Response(
        JSON.stringify({ status: "error", code: "NOT_FOUND", message: `No mock handler for ${method} ${path}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(JSON.stringify(result.body), {
      status: result.httpStatus,
      headers: { "Content-Type": "application/json" },
    })
  }
}
