import { get, post, patch, MockError, paginate } from "../router"
import { getDb, nextId, saveDb } from "../db"
import type { SeedReferralCode } from "../seed"

function toApiCode(c: SeedReferralCode) {
  const db = getDb()
  const affiliate = db.affiliates.find((a) => a.id === c.affiliateId)
  const site = db.sites.find((s) => s.id === c.siteId)
  return {
    id: c.id,
    affiliateId: c.affiliateId,
    affiliateName: affiliate?.fullName || "",
    affiliateEmail: affiliate?.email,
    siteId: c.siteId,
    siteName: site?.name || "",
    siteUrl: site?.baseUrl,
    code: c.code,
    label: c.label,
    isActive: c.isActive,
    totalClicks: c.totalClicks,
    totalConversions: c.totalConversions,
    lastUsedAt: c.lastUsedAt,
    createdAt: c.createdAt,
    updatedAt: c.createdAt,
    referralUrl: site ? `${site.baseUrl}?ref=${c.code}` : undefined,
  }
}

function filterCodes(req: any) {
  const db = getDb()
  let items = db.referralCodes.slice()
  const affiliateId = req.query.get("affiliateId")
  const siteId = req.query.get("siteId")
  const isActive = req.query.get("isActive")
  if (affiliateId) items = items.filter((c) => c.affiliateId === Number(affiliateId))
  if (siteId) items = items.filter((c) => c.siteId === Number(siteId))
  if (isActive !== null) items = items.filter((c) => c.isActive === (isActive === "true"))
  return items
}

get("/referral-codes/search", (req) => {
  const q = (req.query.get("q") || "").toLowerCase()
  let items = filterCodes(req)
  if (q) items = items.filter((c) => c.code.toLowerCase().includes(q))
  const limit = Number(req.query.get("limit") || 20)
  return { data: items.slice(0, limit).map(toApiCode) }
})

get("/referral-codes/me", (req) => {
  if (!req.authUser?.affiliateId) return { data: { referralCodes: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } }
  const db = getDb()
  const items = db.referralCodes.filter((c) => c.affiliateId === req.authUser!.affiliateId)
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiCode), pagination }
})

get("/referral-codes/code/:code", (req) => {
  const db = getDb()
  const c = db.referralCodes.find((x) => x.code === req.params.code)
  if (!c) throw new MockError(404, "NOT_FOUND", "Referral code not found")
  return { data: toApiCode(c) }
})

get("/referral-codes/:id/stats", (req) => {
  const db = getDb()
  const c = db.referralCodes.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Referral code not found")
  const conversions = db.conversions.filter((conv) => conv.referralCodeId === c.id)
  const earnings = conversions.filter((cv) => cv.status === "approved").reduce((s, cv) => s + cv.commissionAmountCents, 0)
  return { data: { code: c.code, conversions: c.totalConversions, earnings: (earnings / 100).toFixed(2) } }
})

get("/referral-codes/:id", (req) => {
  const db = getDb()
  const c = db.referralCodes.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Referral code not found")
  return { data: toApiCode(c) }
})

get("/referral-codes", (req) => {
  const items = filterCodes(req)
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiCode), pagination }
})

post("/referral-codes", (req) => {
  const db = getDb()
  const { affiliateId, siteId, code } = req.body || {}
  const id = nextId(db.referralCodes)
  const wordBank = ["NOVA", "PEAK", "AXIS", "FLUX", "ZEST"]
  const newCode: SeedReferralCode = {
    id,
    affiliateId: Number(affiliateId),
    siteId: Number(siteId),
    code: code || `${wordBank[id % wordBank.length]}${10 + (id % 89)}`,
    label: null,
    isActive: true,
    totalClicks: 0,
    totalConversions: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  }
  db.referralCodes.push(newCode)
  saveDb()
  return { data: toApiCode(newCode) }
})

patch("/referral-codes/:id/toggle", (req) => {
  const db = getDb()
  const c = db.referralCodes.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Referral code not found")
  c.isActive = !c.isActive
  saveDb()
  return { data: toApiCode(c) }
})

patch("/referral-codes/:id", (req) => {
  const db = getDb()
  const c = db.referralCodes.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Referral code not found")
  if (req.body?.label !== undefined) c.label = req.body.label
  saveDb()
  return { data: toApiCode(c) }
})

post("/referral-codes/:id/regenerate", (req) => {
  const db = getDb()
  const c = db.referralCodes.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Referral code not found")
  c.code = `${c.code.replace(/\d+$/, "")}${Math.floor(10 + Math.random() * 89)}`
  saveDb()
  return { data: toApiCode(c) }
})
