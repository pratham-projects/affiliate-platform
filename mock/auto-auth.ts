// Writes a demo session straight into localStorage using the same keys and
// shapes authService.login() would after a real POST /auth/login — so a
// visitor never sees a password wall, and the role switcher can swap roles
// instantly (no network round trip, just a fresh set of tokens + a reload).

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "@/lib/api/config"
import { getDb } from "./db"
import { mintAccessToken, mintRefreshToken, DEMO_EXPIRES_IN } from "./session"
import { toApiUser } from "./user"
import type { SeedUser } from "./seed"

export type DemoRole = "affiliate" | "admin" | "super_admin"

function findDemoUser(role: DemoRole): SeedUser {
  const db = getDb()
  if (role === "super_admin") return db.users.find((u) => u.id === db.meta.demoSuperAdminUserId)!
  if (role === "admin") return db.users.find((u) => u.id === db.meta.demoAdminUserId)!
  return db.users.find((u) => u.id === db.meta.demoAffiliateUserId)!
}

export function writeDemoSession(role: DemoRole) {
  if (typeof window === "undefined") return
  const user = findDemoUser(role)
  const accessToken = mintAccessToken(user)
  const refreshToken = mintRefreshToken(user)
  const expiresAt = Date.now() + DEMO_EXPIRES_IN * 1000

  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  window.localStorage.setItem("token_expires_at", String(expiresAt))
  window.localStorage.setItem(USER_KEY, JSON.stringify(toApiUser(user)))
}

export function hasAnySession(): boolean {
  if (typeof window === "undefined") return false
  return !!window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function switchDemoRole(role: DemoRole) {
  writeDemoSession(role)
  const target = role === "affiliate" ? "/" : "/admin"
  window.location.href = target
}

// Called once at module scope on first load (see components/demo/mock-mount.tsx).
// If there's no session yet, auto-authenticate as the demo affiliate so a
// visitor lands straight in the product instead of a login screen.
export function ensureAutoLogin() {
  if (typeof window === "undefined") return
  if (hasAnySession()) return
  writeDemoSession("affiliate")
}
