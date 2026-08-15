// Fake JWTs. Not real tokens — just enough structure for the mock server to
// know who's asking. Far-future expiry, refresh always succeeds, never 401s
// a legitimately-logged-in demo session.

import type { SeedUser } from "./seed"

export interface DemoTokenPayload {
  userId: number
  role: SeedUser["role"]
  affiliateId?: number
  iat: number
}

function b64(obj: unknown): string {
  const json = JSON.stringify(obj)
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(unescape(encodeURIComponent(json)))
  }
  return Buffer.from(json).toString("base64")
}

function unb64(str: string): unknown {
  const json =
    typeof window !== "undefined" && typeof window.atob === "function"
      ? decodeURIComponent(escape(window.atob(str)))
      : Buffer.from(str, "base64").toString("utf-8")
  return JSON.parse(json)
}

export function mintAccessToken(user: SeedUser): string {
  const payload: DemoTokenPayload = {
    userId: user.id,
    role: user.role,
    affiliateId: user.affiliateId,
    iat: Date.now(),
  }
  return `demo.${b64(payload)}.access`
}

export function mintRefreshToken(user: SeedUser): string {
  return `demo.${b64({ userId: user.id, iat: Date.now() })}.refresh`
}

export function parseAuthHeader(authHeader: string | null): DemoTokenPayload | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, "")
  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== "demo") return null
  try {
    return unb64(parts[1]) as DemoTokenPayload
  } catch {
    return null
  }
}

// Far-future expiry (1 year) — the demo never has to deal with real expiry.
export const DEMO_EXPIRES_IN = 60 * 60 * 24 * 365
