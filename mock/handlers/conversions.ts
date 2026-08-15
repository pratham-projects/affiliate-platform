import { get, patch, MockError, paginate } from "../router"
import { getDb, centsToStr, saveDb, affiliateFinancials } from "../db"
import type { SeedConversion } from "../seed"

function toApiConversion(c: SeedConversion) {
  const db = getDb()
  const site = db.sites.find((s) => s.id === c.siteId)
  const affiliate = db.affiliates.find((a) => a.id === c.affiliateId)
  const code = db.referralCodes.find((rc) => rc.id === c.referralCodeId)
  return {
    id: c.id,
    siteId: c.siteId,
    siteName: site?.name || "",
    siteUrl: site?.baseUrl,
    affiliateId: c.affiliateId,
    affiliateName: affiliate?.fullName || "",
    affiliateEmail: affiliate?.email,
    customerEmail: c.customerEmail,
    conversionDate: c.conversionDate,
    purchaseAmount: centsToStr(c.purchaseAmountCents),
    currency: c.currency,
    commissionPercentage: c.commissionPercentage,
    commissionAmount: centsToStr(c.commissionAmountCents),
    conversionType: c.conversionType,
    status: c.status,
    isTest: c.isTest,
    createdAt: c.createdAt,
    referralCode: code?.code,
  }
}

function applyFilters(req: any, base: SeedConversion[]) {
  let items = base
  const status = req.query.get("status")
  const affiliateId = req.query.get("affiliateId")
  const siteId = req.query.get("siteId")
  const startDate = req.query.get("startDate")
  const endDate = req.query.get("endDate")
  const search = (req.query.get("search") || "").toLowerCase()
  const conversionType = req.query.get("conversionType")
  const isTest = req.query.get("isTest")

  if (status && status !== "all") items = items.filter((c) => c.status === status)
  if (affiliateId) items = items.filter((c) => c.affiliateId === Number(affiliateId))
  if (siteId) items = items.filter((c) => c.siteId === Number(siteId))
  if (startDate) items = items.filter((c) => c.conversionDate >= startDate)
  if (endDate) items = items.filter((c) => c.conversionDate <= endDate + "T23:59:59.999Z")
  if (conversionType && conversionType !== "all") items = items.filter((c) => c.conversionType === conversionType)
  if (isTest !== null) items = items.filter((c) => c.isTest === (isTest === "true"))
  if (search) items = items.filter((c) => c.customerEmail.toLowerCase().includes(search))
  return items
}

get("/conversions/search", (req) => {
  const db = getDb()
  let items = applyFilters(req, db.conversions)
  const limit = Number(req.query.get("limit") || 20)
  return { data: items.slice(0, limit).map(toApiConversion) }
})

get("/conversions/me", (req) => {
  if (!req.authUser?.affiliateId) return { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
  const db = getDb()
  const mine = db.conversions.filter((c) => c.affiliateId === req.authUser!.affiliateId)
  const items = applyFilters(req, mine).slice().sort((a, b) => b.conversionDate.localeCompare(a.conversionDate))
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 10)
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiConversion), pagination }
})

get("/conversions/:id", (req) => {
  const db = getDb()
  const c = db.conversions.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Conversion not found")
  return { data: toApiConversion(c) }
})

get("/conversions", (req) => {
  const db = getDb()
  const items = applyFilters(req, db.conversions).slice().sort((a, b) => b.conversionDate.localeCompare(a.conversionDate))
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 10)
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiConversion), pagination }
})

patch("/conversions/:id", (req) => {
  const db = getDb()
  const c = db.conversions.find((x) => x.id === Number(req.params.id))
  if (!c) throw new MockError(404, "NOT_FOUND", "Conversion not found")
  const { status } = req.body || {}
  if (status) c.status = status
  saveDb()
  return { data: toApiConversion(c) }
})
