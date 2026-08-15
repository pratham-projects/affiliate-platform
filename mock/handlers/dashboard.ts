import { get, MockError } from "../router"
import { getDb, centsToStr, affiliateFinancials, affiliateConversionStats } from "../db"

function currentMonthKey(iso: string) {
  return iso.slice(0, 7)
}

// Serves both dashboardService.getAdminDashboard() (AdminDashboardData) and
// reportsService.getDashboard() (DashboardStats) — the real backend returns
// one superset object for /reports/dashboard and each frontend reader only
// looks at the fields it knows about, so the mock does the same.
get("/reports/dashboard", (req) => {
  const db = getDb()
  const thisMonth = currentMonthKey(db.meta.generatedAt)

  const approvedConversions = db.conversions.filter((c) => c.status === "approved")
  const thisMonthApproved = approvedConversions.filter((c) => currentMonthKey(c.conversionDate) === thisMonth)
  const thisMonthAll = db.conversions.filter((c) => currentMonthKey(c.conversionDate) === thisMonth)

  const totalCommissionsThisMonthCents = thisMonthApproved.reduce((s, c) => s + c.commissionAmountCents, 0)
  const totalRevenueCents = approvedConversions.reduce((s, c) => s + c.purchaseAmountCents, 0)
  const totalCommissionCents = approvedConversions.reduce((s, c) => s + c.commissionAmountCents, 0)

  const completedPayoutsThisMonth = db.payouts.filter(
    (p) => p.status === "completed" && p.completedAt && currentMonthKey(p.completedAt) === thisMonth
  )
  const totalPayoutsThisMonthCents = completedPayoutsThisMonth.reduce((s, p) => s + (p.approvedAmountCents || 0), 0)

  const affiliateBalances = db.affiliates
    .filter((a) => a.status === "approved")
    .map((a) => ({ a, fin: affiliateFinancials(a.id) }))

  const pendingPayoutsCents = affiliateBalances.reduce((s, { fin }) => s + fin.pendingBalanceCents, 0)

  const totalClicks = db.referralCodes.reduce((s, c) => s + c.totalClicks, 0)

  const avgPctBasisPoints =
    approvedConversions.length > 0
      ? Math.round(
          (approvedConversions.reduce((s, c) => s + Number(c.commissionPercentage), 0) / approvedConversions.length) * 100
        )
      : 1500

  const topAffiliateEntry = affiliateBalances.slice().sort((a, b) => b.fin.totalEarnedCents - a.fin.totalEarnedCents)[0]
  const codesSorted = db.referralCodes.slice().sort((a, b) => b.totalConversions - a.totalConversions)
  const topCode = codesSorted[0]

  const latestConversions = db.conversions
    .slice()
    .sort((a, b) => b.conversionDate.localeCompare(a.conversionDate))
    .slice(0, 8)
    .map((c) => {
      const aff = db.affiliates.find((a) => a.id === c.affiliateId)
      const site = db.sites.find((s) => s.id === c.siteId)
      return {
        id: c.id,
        affiliateId: c.affiliateId,
        affiliateName: aff?.fullName,
        siteName: site?.name || "Unknown site",
        amount: centsToStr(c.purchaseAmountCents),
        purchaseAmount: centsToStr(c.purchaseAmountCents),
        commission: centsToStr(c.commissionAmountCents),
        commissionAmount: centsToStr(c.commissionAmountCents),
        currency: c.currency,
        status: c.status,
        date: c.conversionDate,
        conversionDate: c.conversionDate,
        isTest: c.isTest,
        customerEmail: c.customerEmail,
      }
    })

  const pendingPayoutsList = affiliateBalances
    .filter(({ fin }) => fin.pendingBalanceCents > 0)
    .sort((a, b) => b.fin.pendingBalanceCents - a.fin.pendingBalanceCents)
    .slice(0, 6)
    .map(({ a, fin }) => ({
      affiliateId: a.id,
      affiliateName: a.fullName,
      email: a.email,
      pendingBalance: centsToStr(fin.pendingBalanceCents),
      totalEarned: centsToStr(fin.totalEarnedCents),
    }))

  return {
    data: {
      timestamp: db.meta.generatedAt,
      totalAffiliates: db.affiliates.length,
      activeAffiliates: db.affiliates.filter((a) => a.status === "approved").length,
      pendingAffiliates: db.affiliates.filter((a) => a.status === "pending").length,
      totalSites: db.sites.length,
      activeSites: db.sites.filter((s) => s.status === "active").length,
      totalCommissionsThisMonth: centsToStr(totalCommissionsThisMonthCents),
      totalPayoutsThisMonth: centsToStr(totalPayoutsThisMonthCents),
      pendingPayouts: centsToStr(pendingPayoutsCents),
      conversionsThisMonth: thisMonthAll.length,
      totalRevenue: centsToStr(totalRevenueCents),
      totalCommission: centsToStr(totalCommissionCents),
      totalClicks,
      totalConversions: db.conversions.length,
      conversionRate: totalClicks > 0 ? Number(((approvedConversions.length / totalClicks) * 100).toFixed(2)) : 0,
      averageCommissionPercentage: avgPctBasisPoints,
      topAffiliate: topAffiliateEntry ? { id: topAffiliateEntry.a.id, name: topAffiliateEntry.a.fullName, earned: centsToStr(topAffiliateEntry.fin.totalEarnedCents) } : null,
      topCode: topCode ? { id: topCode.id, code: topCode.code, conversions: topCode.totalConversions } : null,
      latestConversions,
      pendingPayoutsList,
    },
  }
})

get("/affiliates/me/dashboard", (req) => {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  const db = getDb()
  const affiliateId = req.authUser.affiliateId
  const affiliate = db.affiliates.find((a) => a.id === affiliateId)
  if (!affiliate) throw new MockError(404, "NOT_FOUND", "Affiliate not found")

  const fin = affiliateFinancials(affiliateId)
  const stats = affiliateConversionStats(affiliateId)
  const activeSites = new Set(
    db.siteAssignments.filter((sa) => sa.affiliateId === affiliateId && sa.isActive).map((sa) => sa.siteId)
  ).size
  const activeReferralCodes = db.referralCodes.filter((c) => c.affiliateId === affiliateId && c.isActive).length

  const recentConversions = db.conversions
    .filter((c) => c.affiliateId === affiliateId)
    .sort((a, b) => b.conversionDate.localeCompare(a.conversionDate))
    .slice(0, 5)
    .map((c) => {
      const site = db.sites.find((s) => s.id === c.siteId)
      return {
        id: c.id,
        siteName: site?.name || "Unknown site",
        customerEmail: c.customerEmail,
        amount: centsToStr(c.purchaseAmountCents),
        commission: centsToStr(c.commissionAmountCents),
        commissionAmount: centsToStr(c.commissionAmountCents),
        status: c.status,
        date: c.conversionDate,
        createdAt: c.createdAt,
        isTest: c.isTest,
      }
    })

  const recentPayments = db.payments
    .filter((p) => p.affiliateId === affiliateId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((p) => ({ id: p.id, amount: centsToStr(p.amountCents), status: p.status, date: p.createdAt }))

  return {
    data: {
      affiliateId,
      affiliateName: affiliate.fullName,
      status: affiliate.status,
      pendingBalance: centsToStr(fin.pendingBalanceCents),
      totalEarned: centsToStr(fin.totalEarnedCents),
      totalConversions: stats.total,
      approvedConversions: stats.approved,
      pendingConversions: stats.pending,
      totalClicks: stats.totalClicks,
      conversionRate: stats.conversionRate.toFixed(2),
      activeSites,
      activeReferralCodes,
      recentConversions,
      recentPayments,
    },
  }
})
