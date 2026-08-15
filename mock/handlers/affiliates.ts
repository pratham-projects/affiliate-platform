import { get, patch, MockError, paginate } from "../router"
import { getDb, centsToStr, affiliateFinancials, affiliateConversionStats, saveDb } from "../db"
import type { SeedAffiliate } from "../seed"

function toApiAffiliate(a: SeedAffiliate) {
  const fin = affiliateFinancials(a.id)
  const db = getDb()
  const activeCodes = db.referralCodes.filter((c) => c.affiliateId === a.id && c.isActive).length
  return {
    id: a.id,
    userId: a.userId,
    email: a.email,
    fullName: a.fullName,
    companyName: a.companyName,
    country: a.country,
    phone: a.phone,
    contactPlatform: a.contactPlatform,
    contactIdentifier: a.contactIdentifier,
    trackingId: a.trackingId,
    sourceUrl: a.sourceUrl,
    status: a.status,
    pendingBalance: centsToStr(fin.pendingBalanceCents),
    totalEarned: centsToStr(fin.totalEarnedCents),
    activeCodesCount: activeCodes,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

get("/affiliates/search", (req) => {
  const db = getDb()
  const q = (req.query.get("q") || "").toLowerCase()
  const status = req.query.get("status")
  let items = db.affiliates.filter((a) => a.status !== "deleted")
  if (q) items = items.filter((a) => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  if (status && status !== "all") items = items.filter((a) => a.status === status)
  const limit = Number(req.query.get("limit") || 20)
  return { data: items.slice(0, limit).map(toApiAffiliate) }
})

get("/affiliates/user/:userId", (req) => {
  const db = getDb()
  const a = db.affiliates.find((x) => x.userId === Number(req.params.userId))
  if (!a) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  return { data: toApiAffiliate(a) }
})

get("/affiliates/code/:code", (req) => {
  const db = getDb()
  const code = db.referralCodes.find((c) => c.code === req.params.code)
  if (!code) throw new MockError(404, "NOT_FOUND", "Code not found")
  const a = db.affiliates.find((x) => x.id === code.affiliateId)
  if (!a) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  return { data: toApiAffiliate(a) }
})

get("/affiliates/me", (req) => {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  const db = getDb()
  const a = db.affiliates.find((x) => x.id === req.authUser!.affiliateId)
  if (!a) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  return { data: toApiAffiliate(a) }
})

get("/affiliates/me/tracking-links", (req) => {
  if (!req.authUser?.affiliateId) return { data: [] }
  const db = getDb()
  const affiliateId = req.authUser.affiliateId
  const assignments = db.siteAssignments.filter((sa) => sa.affiliateId === affiliateId && sa.isActive)
  return {
    data: assignments.map((sa) => {
      const site = db.sites.find((s) => s.id === sa.siteId)!
      const code = db.referralCodes.find((c) => c.affiliateId === affiliateId && c.siteId === sa.siteId)
      return {
        siteId: site.id,
        siteName: site.name,
        siteUrl: site.baseUrl,
        baseUrl: site.baseUrl,
        isActive: sa.isActive,
        assignmentDate: sa.createdAt,
        trackingId: db.affiliates.find((a) => a.id === affiliateId)!.trackingId,
        trackingUrls: {
          subdirectory: `${site.baseUrl}/r/${code?.code ?? ""}`,
          queryParam: `${site.baseUrl}?ref=${code?.code ?? ""}`,
        },
      }
    }),
  }
})

get("/affiliates/:id/stats", (req) => {
  const id = Number(req.params.id)
  const fin = affiliateFinancials(id)
  return { data: { id, pendingBalance: centsToStr(fin.pendingBalanceCents), totalEarned: centsToStr(fin.totalEarnedCents) } }
})

get("/affiliates/:id/detailed-summary", (req) => {
  const db = getDb()
  const id = Number(req.params.id)
  const affiliate = db.affiliates.find((a) => a.id === id)
  if (!affiliate) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  const user = db.users.find((u) => u.id === affiliate.userId)!
  const fin = affiliateFinancials(id)
  const stats = affiliateConversionStats(id)

  const planAssignment = db.planAssignments.find((pa) => pa.affiliateId === id && pa.isActive)
  const plans = planAssignment
    ? [
        (() => {
          const plan = db.plans.find((p) => p.id === planAssignment.planId)!
          const effective = planAssignment.customCommissionOverride || plan.baseCommissionPercentage
          return {
            assignmentId: planAssignment.id,
            planId: plan.id,
            planName: plan.planName,
            baseCommissionPercentage: plan.baseCommissionPercentage,
            commissionDurationType: plan.commissionDurationType,
            durationMonths: plan.durationMonths,
            effectiveCommission: effective,
            effectiveDurationType: planAssignment.customDurationOverride || plan.commissionDurationType,
            effectiveDurationMonths: planAssignment.customDurationMonths ?? plan.durationMonths,
            hasOverride: !!planAssignment.customCommissionOverride,
            isActive: planAssignment.isActive,
            assignmentDate: planAssignment.createdAt,
          }
        })(),
      ]
    : []

  const siteAssignments = db.siteAssignments.filter((sa) => sa.affiliateId === id)
  const sites = siteAssignments.map((sa) => {
    const site = db.sites.find((s) => s.id === sa.siteId)!
    return {
      assignmentId: sa.id,
      siteId: site.id,
      siteName: site.name,
      baseUrl: site.baseUrl,
      description: site.description,
      status: site.status,
      isActive: sa.isActive,
      assignmentDate: sa.createdAt,
    }
  })

  const codes = db.referralCodes.filter((c) => c.affiliateId === id)
  const referralCodes = codes.map((c) => {
    const site = db.sites.find((s) => s.id === c.siteId)!
    return {
      codeId: c.id,
      code: c.code,
      label: c.label,
      siteId: site.id,
      siteName: site.name,
      isActive: c.isActive,
      totalClicks: c.totalClicks,
      totalConversions: c.totalConversions,
      conversionRate: c.totalClicks > 0 ? ((c.totalConversions / c.totalClicks) * 100).toFixed(2) : "0.00",
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
    }
  })

  const affConversions = db.conversions.filter((c) => c.affiliateId === id)
  const approvedConversions = affConversions.filter((c) => c.status === "approved")
  const totalPayments = db.payments.filter((p) => p.affiliateId === id).length
  const completedPayments = db.payments.filter((p) => p.affiliateId === id && p.status === "completed").length

  const recentConversions = affConversions
    .slice()
    .sort((a, b) => b.conversionDate.localeCompare(a.conversionDate))
    .slice(0, 10)
    .map((c) => {
      const site = db.sites.find((s) => s.id === c.siteId)!
      const code = db.referralCodes.find((rc) => rc.id === c.referralCodeId)
      return {
        id: c.id,
        siteId: site.id,
        siteName: site.name,
        conversionDate: c.conversionDate,
        purchaseAmount: centsToStr(c.purchaseAmountCents),
        currency: c.currency,
        commissionAmount: centsToStr(c.commissionAmountCents),
        commissionPercentage: c.commissionPercentage,
        status: c.status,
        conversionType: c.conversionType,
        customerEmail: c.customerEmail,
        isTest: c.isTest,
        referralCode: code?.code,
      }
    })

  const recentPayments = db.payments
    .filter((p) => p.affiliateId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((p) => ({ id: p.id, amount: centsToStr(p.amountCents), createdAt: p.createdAt, status: p.status, notes: p.notes }))

  const recentClicks = codes.slice(0, 5).map((c, i) => ({
    id: i + 1,
    referralCodeId: c.id,
    code: c.code,
    siteName: db.sites.find((s) => s.id === c.siteId)?.name || "",
    ipAddress: null,
    referrer: "google.com",
    landingPage: "/pricing",
    createdAt: c.lastUsedAt || c.createdAt,
  }))

  const performanceBySite = sites.map((s) => {
    const siteConversions = affConversions.filter((c) => c.siteId === s.siteId)
    const approved = siteConversions.filter((c) => c.status === "approved")
    return {
      siteId: s.siteId,
      siteName: s.siteName,
      description: s.description,
      conversions: siteConversions.length,
      approvedConversions: approved.length,
      revenue: centsToStr(approved.reduce((sum, c) => sum + c.purchaseAmountCents, 0)),
      commission: centsToStr(siteConversions.reduce((sum, c) => sum + c.commissionAmountCents, 0)),
      approvedCommission: centsToStr(approved.reduce((sum, c) => sum + c.commissionAmountCents, 0)),
    }
  })

  const topReferralCodes = referralCodes
    .slice()
    .sort((a, b) => b.totalConversions - a.totalConversions)
    .slice(0, 5)
    .map((c) => {
      const codeConversions = affConversions.filter((conv) => conv.referralCodeId === c.codeId)
      return {
        codeId: c.codeId,
        code: c.code,
        label: c.label,
        siteName: c.siteName,
        clicks: c.totalClicks,
        conversions: c.totalConversions,
        conversionRate: c.conversionRate,
        revenue: centsToStr(codeConversions.reduce((sum, conv) => sum + conv.purchaseAmountCents, 0)),
        commission: centsToStr(codeConversions.reduce((sum, conv) => sum + conv.commissionAmountCents, 0)),
      }
    })

  return {
    data: {
      affiliate: {
        id: affiliate.id,
        userId: affiliate.userId,
        trackingId: affiliate.trackingId,
        contactPlatform: affiliate.contactPlatform,
        contactIdentifier: affiliate.contactIdentifier,
        sourceUrl: affiliate.sourceUrl,
        pendingBalance: centsToStr(fin.pendingBalanceCents),
        totalEarned: centsToStr(fin.totalEarnedCents),
        createdAt: affiliate.createdAt,
        updatedAt: affiliate.updatedAt,
      },
      user: {
        email: affiliate.email,
        fullName: affiliate.fullName,
        companyName: affiliate.companyName,
        country: affiliate.country,
        phone: affiliate.phone,
        role: user.role,
        status: affiliate.status,
        registrationDate: affiliate.createdAt,
      },
      plans,
      sites,
      referralCodes,
      stats: {
        totalClicks: stats.totalClicks,
        totalConversions: stats.total,
        approvedConversions: stats.approved,
        pendingConversions: stats.pending,
        rejectedConversions: stats.rejected,
        chargebackConversions: stats.chargeback,
        conversionRate: stats.conversionRate.toFixed(2),
        totalRevenue: centsToStr(affConversions.reduce((sum, c) => sum + c.purchaseAmountCents, 0)),
        approvedRevenue: centsToStr(approvedConversions.reduce((sum, c) => sum + c.purchaseAmountCents, 0)),
        totalCommission: centsToStr(affConversions.reduce((sum, c) => sum + c.commissionAmountCents, 0)),
        approvedCommission: centsToStr(fin.totalEarnedCents),
        pendingCommission: centsToStr(fin.pendingBalanceCents),
        averageOrderValue:
          approvedConversions.length > 0
            ? centsToStr(Math.round(approvedConversions.reduce((sum, c) => sum + c.purchaseAmountCents, 0) / approvedConversions.length))
            : "0.00",
        uniqueCustomers: new Set(affConversions.map((c) => c.customerEmail)).size,
        totalPayments,
        completedPayments,
        totalPaid: centsToStr(fin.totalPaidOutCents),
      },
      recentConversions,
      recentPayments,
      recentClicks,
      performanceBySite,
      topReferralCodes,
      conversionTypes: db.conversionTypes,
    },
  }
})

get("/affiliates/:id", (req) => {
  const db = getDb()
  const a = db.affiliates.find((x) => x.id === Number(req.params.id))
  if (!a) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  return { data: toApiAffiliate(a) }
})

get("/affiliates", (req) => {
  const db = getDb()
  const status = req.query.get("status")
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 10)
  let items = db.affiliates.filter((a) => a.status !== "deleted")
  if (status && status !== "all") items = items.filter((a) => a.status === status)
  items = items.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiAffiliate), pagination }
})

patch("/affiliates/:id/contact", (req) => {
  const db = getDb()
  const a = db.affiliates.find((x) => x.id === Number(req.params.id))
  if (!a) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  const { contact_platform, contact_identifier, source_url } = req.body || {}
  if (contact_platform) a.contactPlatform = contact_platform
  if (contact_identifier) a.contactIdentifier = contact_identifier
  if (source_url !== undefined) a.sourceUrl = source_url
  a.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiAffiliate(a) }
})

patch("/affiliates/:id", (req) => {
  const db = getDb()
  const a = db.affiliates.find((x) => x.id === Number(req.params.id))
  if (!a) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  const { status } = req.body || {}
  if (status) a.status = status
  a.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiAffiliate(a) }
})
