import { get, MockError, paginate } from "../router"
import { getDb, centsToStr } from "../db"
import { buildBreakdown, buildTrend, scopedConversions, totalClicksForScope, type Dimension } from "../analytics"

function requireAffiliate(req: any): number {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  return req.authUser.affiliateId
}

get("/reports/overview", () => {
  const db = getDb()
  const totalClicks = db.referralCodes.reduce((s, c) => s + c.totalClicks, 0)
  const conversions = db.conversions
  const approved = conversions.filter((c) => c.status === "approved")
  return {
    data: {
      totalClicks,
      customers: new Set(conversions.map((c) => c.customerEmail)).size,
      conversions: conversions.length,
      revenue: centsToStr(approved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
      commission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
    },
  }
})

get("/reports/affiliates/:id/performance", (req) => {
  const db = getDb()
  const id = Number(req.params.id)
  const affiliate = db.affiliates.find((a) => a.id === id)
  if (!affiliate) throw new MockError(404, "NOT_FOUND", "Affiliate not found")
  const conversions = scopedConversions(id)
  const approved = conversions.filter((c) => c.status === "approved")
  const clicks = totalClicksForScope(id)
  const code = db.referralCodes.find((c) => c.affiliateId === id)
  return {
    data: {
      affiliateId: id,
      affiliateName: affiliate.fullName,
      email: affiliate.email,
      totalClicks: clicks,
      totalConversions: conversions.length,
      totalRevenue: centsToStr(approved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
      totalCommission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
      conversionRate: clicks > 0 ? Number(((approved.length / clicks) * 100).toFixed(2)) : 0,
      referralCode: code?.code,
    },
  }
})

get("/reports/top-affiliates", (req) => {
  const db = getDb()
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const ranked = db.affiliates
    .filter((a) => a.status === "approved")
    .map((a) => {
      const conversions = scopedConversions(a.id)
      const approved = conversions.filter((c) => c.status === "approved")
      return {
        id: a.id,
        affiliateId: a.id,
        affiliateName: a.fullName,
        fullName: a.fullName,
        email: a.email,
        totalRevenue: centsToStr(approved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
        totalCommission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
        totalConversions: conversions.length,
        totalEarned: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
        conversionCount: conversions.length,
        referralCode: db.referralCodes.find((c) => c.affiliateId === a.id)?.code,
      }
    })
    .sort((a, b) => Number(b.totalCommission) - Number(a.totalCommission))
    .map((a, i) => ({ ...a, rank: i + 1 }))
  const page = ranked.slice(offset, offset + limit)
  return { data: { affiliates: page, pagination: { limit, offset, total: ranked.length } } }
})

get("/analytics/admin-summary", (req) => {
  const overview = {
    totalClicks: totalClicksForScope(),
    customers: new Set(scopedConversions().map((c) => c.customerEmail)).size,
    conversions: scopedConversions().length,
    revenue: centsToStr(scopedConversions().filter((c) => c.status === "approved").reduce((s, c) => s + c.purchaseAmountCents, 0)),
    commission: centsToStr(scopedConversions().filter((c) => c.status === "approved").reduce((s, c) => s + c.commissionAmountCents, 0)),
  }
  const db = getDb()
  const topAffiliates = db.affiliates
    .filter((a) => a.status === "approved")
    .map((a) => {
      const approved = scopedConversions(a.id).filter((c) => c.status === "approved")
      return {
        affiliateId: a.id,
        affiliateName: a.fullName,
        totalCommission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
        totalConversions: approved.length,
      }
    })
    .sort((a, b) => Number(b.totalCommission) - Number(a.totalCommission))
    .slice(0, 5)

  const rawRows = (dim: Dimension) =>
    buildBreakdown(dim).map((r) => ({ [dim]: r.key, totalConversions: r.totalConversions, totalConversionAmount: r.totalConversionAmount }))

  return {
    data: {
      overview,
      topAffiliates,
      browsers: rawRows("browser"),
      os: rawRows("os"),
      devices: rawRows("deviceType"),
      totals: {
        affiliates: db.affiliates.filter((a) => a.status === "approved").length,
        referrers: new Set(db.conversions.map((c) => c.referrer)).size,
        os: new Set(db.conversions.map((c) => c.os)).size,
        browsers: new Set(db.conversions.map((c) => c.browser)).size,
        countries: new Set(db.conversions.map((c) => c.country)).size,
        devices: new Set(db.conversions.map((c) => c.deviceType)).size,
      },
    },
  }
})

get("/reports/top-codes", (req) => {
  const db = getDb()
  const limit = Number(req.query.get("limit") || 20)
  const codes = db.referralCodes
    .slice()
    .sort((a, b) => b.totalConversions - a.totalConversions)
    .slice(0, limit)
    .map((c) => {
      const affiliate = db.affiliates.find((a) => a.id === c.affiliateId)!
      const revenue = scopedConversions(c.affiliateId)
        .filter((conv) => conv.referralCodeId === c.id && conv.status === "approved")
        .reduce((s, conv) => s + conv.purchaseAmountCents, 0)
      return {
        id: c.id,
        code: c.code,
        affiliateId: affiliate.id,
        affiliateName: affiliate.fullName,
        totalClicks: c.totalClicks,
        totalConversions: c.totalConversions,
        totalRevenue: centsToStr(revenue),
        conversionRate: c.totalClicks > 0 ? Number(((c.totalConversions / c.totalClicks) * 100).toFixed(2)) : 0,
      }
    })
  return { data: codes }
})

get("/reports/trends", (req) => {
  const metric = (req.query.get("metric") || "conversions") as any
  const period = req.query.get("period") || "daily"
  const count = Number(req.query.get("count") || 400)
  const affiliateId = req.query.get("affiliateId") ? Number(req.query.get("affiliateId")) : undefined
  const daily = buildTrend(metric, Math.min(count, 400), affiliateId)
  if (period === "daily" || !period) return { data: daily }

  // weekly/monthly bucketing on top of the daily series
  const bucketSize = period === "weekly" ? 7 : 30
  const buckets: { date: string; value: number }[] = []
  for (let i = 0; i < daily.length; i += bucketSize) {
    const slice = daily.slice(i, i + bucketSize)
    buckets.push({ date: slice[0].date, value: slice.reduce((s, d) => s + d.value, 0) })
  }
  return { data: buckets }
})

get("/reports/geographic", (req) => {
  const rows = buildBreakdown("country")
  return {
    data: rows.map((r) => ({
      location: r.key,
      conversions: r.totalConversions,
      revenue: r.totalConversionAmount,
      percentage: rows.reduce((s, x) => s + x.totalConversions, 0) > 0
        ? ((r.totalConversions / rows.reduce((s, x) => s + x.totalConversions, 0)) * 100).toFixed(1)
        : "0.0",
    })),
  }
})

get("/reports/sites", () => {
  const db = getDb()
  return {
    data: db.sites.map((site) => {
      const conversions = db.conversions.filter((c) => c.siteId === site.id)
      const approved = conversions.filter((c) => c.status === "approved")
      return {
        siteId: site.id,
        siteName: site.name,
        conversions: conversions.length,
        revenue: centsToStr(approved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
        commission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
      }
    }),
  }
})

get("/reports/export", (req) => {
  const type = req.query.get("type") || "conversions"
  return { data: { note: `CSV export is not wired up in the demo (type=${type}).` } }
})

get("/reports/browsers", () => ({
  data: buildBreakdown("browser").map((r) => ({ browser: r.key, conversions: r.totalConversions, revenue: r.totalConversionAmount, percentage: pct(r, "browser") })),
}))
get("/reports/operating-systems", () => ({
  data: buildBreakdown("os").map((r) => ({ os: r.key, conversions: r.totalConversions, revenue: r.totalConversionAmount, percentage: pct(r, "os") })),
}))
get("/reports/devices", () => ({
  data: buildBreakdown("deviceType").map((r) => ({ deviceType: r.key, conversions: r.totalConversions, revenue: r.totalConversionAmount, percentage: pct(r, "deviceType") })),
}))
get("/reports/landing-pages", (req) => {
  const db = getDb()
  const limit = Number(req.query.get("limit") || 20)
  const groups = new Map<string, typeof db.conversions>()
  db.conversions.forEach((c) => {
    if (!groups.has(c.landingPage)) groups.set(c.landingPage, [])
    groups.get(c.landingPage)!.push(c)
  })
  const rows = Array.from(groups.entries())
    .map(([landingPage, rows]) => {
      const approved = rows.filter((r) => r.status === "approved")
      return {
        landingPage,
        conversions: rows.length,
        revenue: centsToStr(approved.reduce((s, r) => s + r.purchaseAmountCents, 0)),
        commission: centsToStr(approved.reduce((s, r) => s + r.commissionAmountCents, 0)),
        avgOrderValue: approved.length > 0 ? centsToStr(Math.round(approved.reduce((s, r) => s + r.purchaseAmountCents, 0) / approved.length)) : "0.00",
      }
    })
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit)
  return { data: rows }
})
get("/reports/referrers", (req) => {
  const limit = Number(req.query.get("limit") || 20)
  const rows = buildBreakdown("referrer").slice(0, limit)
  return {
    data: rows.map((r) => ({ referrer: r.key, conversions: r.totalConversions, revenue: r.totalConversionAmount, commission: r.totalCommission })),
  }
})

function pct(row: { totalConversions: number }, dim: Dimension) {
  const all = buildBreakdown(dim)
  const total = all.reduce((s, r) => s + r.totalConversions, 0)
  return total > 0 ? ((row.totalConversions / total) * 100).toFixed(1) : "0.0"
}

// ---------- paginated /analytics/* rows ----------
function analyticsResponse(dim: Dimension, req: any, keyName: string, affiliateId?: number) {
  const rows = buildBreakdown(dim, affiliateId)
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 20)
  const { items, pagination } = paginate(rows, page, limit)
  return {
    data: items.map((r) => ({
      [keyName]: r.key,
      totalClicks: r.totalClicks,
      totalCustomers: r.totalCustomers,
      totalConversions: r.totalConversions,
      totalConversionAmount: r.totalConversionAmount,
      totalCommission: r.totalCommission,
    })),
    pagination: { page: pagination.page, pageSize: pagination.pageSize, total: pagination.total, totalPages: pagination.totalPages, hasNext: pagination.hasNext, hasPrev: pagination.hasPrev },
  }
}

get("/analytics/affiliates", (req) => {
  const db = getDb()
  const rows = db.affiliates
    .filter((a) => a.status === "approved")
    .map((a) => {
      const conversions = scopedConversions(a.id)
      const approved = conversions.filter((c) => c.status === "approved")
      return {
        affiliateId: a.id,
        affiliateName: a.fullName,
        affiliateEmail: a.email,
        totalClicks: totalClicksForScope(a.id),
        totalCustomers: new Set(conversions.map((c) => c.customerEmail)).size,
        totalConversions: conversions.length,
        totalConversionAmount: centsToStr(approved.reduce((s, c) => s + c.purchaseAmountCents, 0)),
        totalCommission: centsToStr(approved.reduce((s, c) => s + c.commissionAmountCents, 0)),
      }
    })
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 20)
  const { items, pagination } = paginate(rows, page, limit)
  return { data: items, pagination }
})

get("/analytics/referrers/me", (req) => analyticsResponse("referrer", req, "referrer", requireAffiliate(req)))
get("/analytics/referrers", (req) => analyticsResponse("referrer", req, "referrer"))
get("/analytics/os/me", (req) => analyticsResponse("os", req, "os", requireAffiliate(req)))
get("/analytics/os", (req) => analyticsResponse("os", req, "os"))
get("/analytics/browsers/me", (req) => analyticsResponse("browser", req, "browser", requireAffiliate(req)))
get("/analytics/browsers", (req) => analyticsResponse("browser", req, "browser"))
get("/analytics/countries/me", (req) => analyticsResponse("country", req, "country", requireAffiliate(req)))
get("/analytics/countries", (req) => analyticsResponse("country", req, "country"))
get("/analytics/devices/me", (req) => analyticsResponse("deviceType", req, "deviceType", requireAffiliate(req)))
get("/analytics/devices", (req) => analyticsResponse("deviceType", req, "deviceType"))
