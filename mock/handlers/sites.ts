import { get, post, patch, del, MockError, paginate } from "../router"
import { getDb, centsToStr, nextId, saveDb, affiliateFinancials } from "../db"
import type { SeedSite } from "../seed"

function toApiSite(s: SeedSite) {
  return { ...s }
}

get("/sites", (req) => {
  const db = getDb()
  const page = Number(req.query.get("page") || req.query.get("offset") ? 1 : 1)
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const currentPage = req.query.has("offset") ? Math.floor(offset / limit) + 1 : Number(req.query.get("page") || 1)
  const items = db.sites.slice()
  const { items: pageItems, pagination } = paginate(items, currentPage, limit)
  return {
    data: { sites: pageItems.map(toApiSite), total: items.length, limit, offset, pagination },
  }
})

post("/sites", (req) => {
  const db = getDb()
  const { name, baseUrl, description, requireSignatureVerification } = req.body || {}
  const id = nextId(db.sites)
  const site: SeedSite = {
    id,
    name,
    baseUrl,
    description: description || "",
    status: "active",
    publicApiKey: `pub_demo_${String(id).padStart(4, "0")}`,
    privateApiKey: `priv_demo_${String(id).padStart(4, "0")}`,
    requireSignatureVerification: !!requireSignatureVerification,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.sites.push(site)
  saveDb()
  return { data: toApiSite(site) }
})

get("/sites/:id/detailed-summary", (req) => {
  const db = getDb()
  const id = Number(req.params.id)
  const site = db.sites.find((s) => s.id === id)
  if (!site) throw new MockError(404, "NOT_FOUND", "Site not found")

  const siteAssignments = db.siteAssignments.filter((sa) => sa.siteId === id)
  const affiliates = siteAssignments.map((sa) => {
    const a = db.affiliates.find((x) => x.id === sa.affiliateId)!
    return {
      assignmentId: sa.id,
      affiliateId: a.id,
      userId: a.userId,
      trackingId: a.trackingId,
      email: a.email,
      fullName: a.fullName,
      status: a.status,
      contactPlatform: a.contactPlatform,
      contactIdentifier: a.contactIdentifier,
      isActive: sa.isActive,
      assignmentDate: sa.createdAt,
    }
  })

  const codes = db.referralCodes.filter((c) => c.siteId === id)
  const referralCodes = codes.map((c) => {
    const a = db.affiliates.find((x) => x.id === c.affiliateId)!
    return {
      codeId: c.id,
      code: c.code,
      label: c.label,
      affiliateId: a.id,
      affiliateName: a.fullName,
      affiliateEmail: a.email,
      isActive: c.isActive,
      totalClicks: c.totalClicks,
      totalConversions: c.totalConversions,
      conversionRate: c.totalClicks > 0 ? ((c.totalConversions / c.totalClicks) * 100).toFixed(2) : "0.00",
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
    }
  })

  const siteConversions = db.conversions.filter((c) => c.siteId === id)
  const approved = siteConversions.filter((c) => c.status === "approved")
  const siteConversionsMapped = siteConversions
    .slice()
    .sort((a, b) => b.conversionDate.localeCompare(a.conversionDate))
    .slice(0, 20)
    .map((c) => {
      const a = db.affiliates.find((x) => x.id === c.affiliateId)!
      const code = db.referralCodes.find((rc) => rc.id === c.referralCodeId)
      return {
        id: c.id,
        affiliateId: a.id,
        affiliateName: a.fullName,
        affiliateEmail: a.email,
        conversionDate: c.conversionDate,
        purchaseAmount: centsToStr(c.purchaseAmountCents),
        currency: c.currency,
        commissionAmount: centsToStr(c.commissionAmountCents),
        commissionPercentage: c.commissionPercentage,
        status: c.status,
        conversionType: c.conversionType,
        customerEmail: c.customerEmail,
        isTest: c.isTest,
        referralCode: code?.code || null,
      }
    })

  const siteAffiliateIds = new Set(siteAssignments.map((sa) => sa.affiliateId))
  const recentPayouts = db.payouts
    .filter((p) => siteAffiliateIds.has(p.affiliateId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      affiliateId: p.affiliateId,
      affiliateName: db.affiliates.find((a) => a.id === p.affiliateId)?.fullName || "",
      amount: centsToStr(p.requestedAmountCents),
      createdAt: p.createdAt,
      status: p.status,
      notes: p.notes,
    }))

  const performanceByAffiliate = affiliates.map((a) => {
    const affConversions = siteConversions.filter((c) => c.affiliateId === a.affiliateId)
    const affApproved = affConversions.filter((c) => c.status === "approved")
    return {
      affiliateId: a.affiliateId,
      affiliateName: a.fullName,
      affiliateEmail: a.email,
      conversions: affConversions.length,
      approvedConversions: affApproved.length,
      revenue: centsToStr(affApproved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
      commission: centsToStr(affConversions.reduce((s, c) => s + c.commissionAmountCents, 0)),
      approvedCommission: centsToStr(affApproved.reduce((s, c) => s + c.commissionAmountCents, 0)),
    }
  })

  const topReferralCodes = referralCodes
    .slice()
    .sort((a, b) => b.totalConversions - a.totalConversions)
    .slice(0, 5)
    .map((c) => ({
      codeId: c.codeId,
      code: c.code,
      label: c.label,
      affiliateName: c.affiliateName,
      clicks: c.totalClicks,
      conversions: c.totalConversions,
    }))

  return {
    data: {
      site: toApiSite(site),
      affiliates,
      referralCodes,
      stats: {
        totalClicks: codes.reduce((s, c) => s + c.totalClicks, 0),
        totalConversions: siteConversions.length,
        approvedConversions: approved.length,
        pendingConversions: siteConversions.filter((c) => c.status === "pending").length,
        rejectedConversions: siteConversions.filter((c) => c.status === "rejected").length,
        chargebackConversions: siteConversions.filter((c) => c.status === "chargeback").length,
        conversionRate: codes.reduce((s, c) => s + c.totalClicks, 0) > 0
          ? ((approved.length / codes.reduce((s, c) => s + c.totalClicks, 0)) * 100).toFixed(2)
          : "0.00",
        totalRevenue: centsToStr(siteConversions.reduce((s, c) => s + c.purchaseAmountCents, 0)),
        approvedRevenue: centsToStr(approved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
        totalCommission: centsToStr(siteConversions.reduce((s, c) => s + c.commissionAmountCents, 0)),
        approvedCommission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
        pendingCommission: centsToStr(
          siteConversions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commissionAmountCents, 0)
        ),
        averageOrderValue: approved.length > 0 ? centsToStr(Math.round(approved.reduce((s, c) => s + c.purchaseAmountCents, 0) / approved.length)) : "0.00",
        uniqueCustomers: new Set(siteConversions.map((c) => c.customerEmail)).size,
        totalPayouts: db.payouts.filter((p) => siteAffiliateIds.has(p.affiliateId)).length,
        completedPayouts: db.payouts.filter((p) => siteAffiliateIds.has(p.affiliateId) && p.status === "completed").length,
        approvedPayouts: db.payouts.filter((p) => siteAffiliateIds.has(p.affiliateId) && p.status === "approved").length,
        pendingPayouts: db.payouts.filter((p) => siteAffiliateIds.has(p.affiliateId) && p.status === "pending").length,
        totalPaid: centsToStr(
          [...siteAffiliateIds].reduce((sum, id) => sum + affiliateFinancials(id).totalPaidOutCents, 0)
        ),
      },
      siteConversions: siteConversionsMapped,
      recentPayouts,
      performanceByAffiliate,
      topReferralCodes,
    },
  }
})

get("/sites/:id", (req) => {
  const db = getDb()
  const s = db.sites.find((x) => x.id === Number(req.params.id))
  if (!s) throw new MockError(404, "NOT_FOUND", "Site not found")
  return { data: toApiSite(s) }
})

patch("/sites/:id", (req) => {
  const db = getDb()
  const s = db.sites.find((x) => x.id === Number(req.params.id))
  if (!s) throw new MockError(404, "NOT_FOUND", "Site not found")
  Object.assign(s, req.body || {})
  s.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiSite(s) }
})

del("/sites/:id", (req) => {
  const db = getDb()
  const idx = db.sites.findIndex((x) => x.id === Number(req.params.id))
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Site not found")
  db.sites.splice(idx, 1)
  saveDb()
  return { message: "Site deleted" }
})

post("/sites/:id/regenerate-keys", (req) => {
  const db = getDb()
  const s = db.sites.find((x) => x.id === Number(req.params.id))
  if (!s) throw new MockError(404, "NOT_FOUND", "Site not found")
  s.publicApiKey = `pub_demo_${Math.random().toString(36).slice(2, 8)}`
  s.privateApiKey = `priv_demo_${Math.random().toString(36).slice(2, 8)}`
  saveDb()
  return { data: toApiSite(s) }
})

post("/webhooks/conversions", () => ({
  data: { received: true, isTest: true },
  message: "Test webhook accepted (demo — no real conversion was created).",
}))
