import { get, post, MockError } from "../router"
import { getDb, nextId, saveDb } from "../db"
import { mintAccessToken, mintRefreshToken, parseAuthHeader, DEMO_EXPIRES_IN } from "../session"
import { toApiUser } from "../user"
import type { SeedUser } from "../seed"

function tokensFor(u: SeedUser) {
  return {
    accessToken: mintAccessToken(u),
    refreshToken: mintRefreshToken(u),
    expiresIn: DEMO_EXPIRES_IN,
    refreshExpiresIn: DEMO_EXPIRES_IN * 2,
  }
}

post("/auth/login", (req) => {
  const { email, password } = req.body || {}
  const db = getDb()
  const user = db.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase())
  if (!user || user.password !== password) {
    return { status: "error", httpStatus: 401, code: "UNAUTHORIZED", message: "Invalid email or password" }
  }
  return { data: { user: toApiUser(user), tokens: tokensFor(user) } }
})

post("/auth/refresh", (req) => {
  const { refreshToken } = req.body || {}
  const payload = parseAuthHeader(refreshToken)
  const db = getDb()
  const user = payload ? db.users.find((u) => u.id === payload.userId) : db.users[0]
  if (!user) throw new MockError(401, "INVALID_TOKEN", "Invalid refresh token")
  return { data: { tokens: tokensFor(user) } }
})

post("/auth/logout", () => ({ message: "Logged out" }))

get("/auth/me", (req) => {
  if (!req.authUser) throw new MockError(401, "UNAUTHORIZED", "Not authenticated")
  const db = getDb()
  const user = db.users.find((u) => u.id === req.authUser!.userId)
  if (!user) throw new MockError(401, "UNAUTHORIZED", "Not authenticated")
  return { data: toApiUser(user) }
})

post("/auth/register", (req) => {
  const db = getDb()
  const { email, fullName, companyName, country, contactPlatform, contactIdentifier, sourceUrl } = req.body || {}
  if (db.users.some((u) => u.email.toLowerCase() === String(email || "").toLowerCase())) {
    throw new MockError(409, "DUPLICATE_ERROR", "An account with this email already exists. Try logging in instead.")
  }
  const affiliateId = nextId(db.affiliates)
  const userId = nextId(db.users)
  const createdAt = new Date().toISOString()
  db.affiliates.push({
    id: affiliateId,
    userId,
    email,
    fullName,
    companyName: companyName || null,
    country: country || null,
    phone: null,
    contactPlatform: contactPlatform || null,
    contactIdentifier: contactIdentifier || null,
    trackingId: `AFF-${String(affiliateId).padStart(4, "0")}`,
    sourceUrl: sourceUrl || null,
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  })
  db.users.push({ id: userId, email, password: "demo1234", fullName, role: "affiliate", status: "approved", affiliateId, createdAt })
  saveDb()
  return {
    data: { userId, email, fullName, status: "pending", message: "Registration received. Your application is pending approval." },
  }
})

post("/auth/password-recovery", () => ({ message: "If that email exists, a recovery link was sent (demo — no email is actually sent)." }))
post("/auth/reset-password", () => ({ message: "Password reset (demo — no-op)." }))
post("/auth/change-password", () => ({ message: "Password changed (demo — no-op)." }))
