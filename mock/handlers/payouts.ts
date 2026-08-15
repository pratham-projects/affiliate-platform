import { get, post, patch, MockError, paginate } from "../router"
import { getDb, centsToStr, saveDb, nextId, affiliateFinancials } from "../db"
import type { SeedPayout } from "../seed"

function toApiPayout(p: SeedPayout) {
  const db = getDb()
  const affiliate = db.affiliates.find((a) => a.id === p.affiliateId)
  return {
    id: p.id,
    affiliateId: p.affiliateId,
    affiliateName: affiliate?.fullName || "",
    affiliateEmail: affiliate?.email || "",
    requestedAmount: centsToStr(p.requestedAmountCents),
    approvedAmount: p.approvedAmountCents !== null ? centsToStr(p.approvedAmountCents) : null,
    currency: p.currency,
    status: p.status,
    includedConversionIds: p.includedConversionIds,
    excludedConversionIds: p.excludedConversionIds,
    rejectionReason: p.rejectionReason,
    approvedBy: p.approvedByName ? 2 : null,
    approvedByName: p.approvedByName,
    approvedAt: p.approvedAt,
    rejectedBy: p.rejectedByName ? 1 : null,
    rejectedByName: p.rejectedByName,
    rejectedAt: p.rejectedAt,
    completedAt: p.completedAt,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

get("/payouts/balance", (req) => {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  const db = getDb()
  const affiliateId = req.authUser.affiliateId
  const fin = affiliateFinancials(affiliateId)
  const paidConversionIds = new Set(
    db.payments.filter((p) => p.affiliateId === affiliateId && p.status === "completed").map((p) => p.conversionId)
  )
  const salesBreakdown = db.conversions
    .filter((c) => c.affiliateId === affiliateId && c.status === "approved" && !paidConversionIds.has(c.id))
    .map((c) => {
      const site = db.sites.find((s) => s.id === c.siteId)!
      return {
        conversionId: c.id,
        siteId: site.id,
        siteName: site.name,
        conversionDate: c.conversionDate,
        purchaseAmount: centsToStr(c.purchaseAmountCents),
        commissionRate: c.commissionPercentage,
        earnedCommission: centsToStr(c.commissionAmountCents),
        currency: c.currency,
        status: c.status,
      }
    })
  const pendingPayoutsTotal = db.payouts
    .filter((p) => p.affiliateId === affiliateId && p.status === "pending")
    .reduce((s, p) => s + p.requestedAmountCents, 0)
  return {
    data: {
      availableBalance: centsToStr(fin.pendingBalanceCents - pendingPayoutsTotal),
      currency: "USD",
      totalEarned: centsToStr(fin.totalEarnedCents),
      totalPaidOut: centsToStr(fin.totalPaidOutCents),
      pendingPayouts: centsToStr(pendingPayoutsTotal),
      salesBreakdown,
    },
  }
})

post("/payouts/request", (req) => {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  const db = getDb()
  const affiliateId = req.authUser.affiliateId
  const paidConversionIds = new Set(
    db.payments.filter((p) => p.affiliateId === affiliateId && p.status === "completed").map((p) => p.conversionId)
  )
  const requestedConversionIds = new Set(
    db.payouts.filter((p) => p.affiliateId === affiliateId && p.status !== "rejected").flatMap((p) => p.includedConversionIds)
  )
  const eligible = db.conversions.filter(
    (c) => c.affiliateId === affiliateId && c.status === "approved" && !paidConversionIds.has(c.id) && !requestedConversionIds.has(c.id)
  )
  if (eligible.length === 0) {
    throw new MockError(400, "NO_BALANCE", "No unpaid approved commission available to request.")
  }
  const total = eligible.reduce((s, c) => s + c.commissionAmountCents, 0)
  const payout: SeedPayout = {
    id: nextId(db.payouts),
    affiliateId,
    requestedAmountCents: total,
    approvedAmountCents: null,
    currency: "USD",
    status: "pending",
    includedConversionIds: eligible.map((c) => c.id),
    excludedConversionIds: [],
    rejectionReason: null,
    approvedByName: null,
    approvedAt: null,
    rejectedByName: null,
    rejectedAt: null,
    completedAt: null,
    notes: req.body?.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.payouts.push(payout)
  saveDb()
  return { data: toApiPayout(payout) }
})

get("/payouts/search", (req) => {
  const db = getDb()
  const q = (req.query.get("q") || "").toLowerCase()
  let items = db.payouts.slice()
  const affiliateId = req.query.get("affiliateId")
  const status = req.query.get("status")
  if (affiliateId) items = items.filter((p) => p.affiliateId === Number(affiliateId))
  if (status && status !== "all") items = items.filter((p) => p.status === status)
  const limit = Number(req.query.get("limit") || 20)
  return { data: items.slice(0, limit).map(toApiPayout) }
})

get("/payouts/:id/conversions", (req) => {
  const db = getDb()
  const payout = db.payouts.find((p) => p.id === Number(req.params.id))
  if (!payout) throw new MockError(404, "NOT_FOUND", "Payout not found")
  const items = payout.includedConversionIds.map((cid) => {
    const c = db.conversions.find((x) => x.id === cid)!
    const site = db.sites.find((s) => s.id === c.siteId)!
    return {
      conversionId: c.id,
      siteName: site.name,
      purchaseAmount: centsToStr(c.purchaseAmountCents),
      commissionRate: c.commissionPercentage,
      earnedCommission: centsToStr(c.commissionAmountCents),
      conversionDate: c.conversionDate,
      status: c.status,
      isExcluded: payout.excludedConversionIds.includes(cid),
    }
  })
  return { data: items, pagination: { page: 1, limit: items.length, total: items.length, totalPages: 1 } }
})

get("/payouts/:id", (req) => {
  const db = getDb()
  const p = db.payouts.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payout not found")
  return { data: toApiPayout(p) }
})

get("/payouts", (req) => {
  const db = getDb()
  let items = db.payouts.slice()
  const affiliateId = req.query.get("affiliateId")
  const status = req.query.get("status")
  if (affiliateId) items = items.filter((p) => p.affiliateId === Number(affiliateId))
  if (status) items = items.filter((p) => p.status === status)
  items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiPayout), pagination }
})

patch("/payouts/:id/approve", (req) => {
  const db = getDb()
  const p = db.payouts.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payout not found")
  const excluded: number[] = req.body?.excluded_conversion_ids || []
  p.excludedConversionIds = excluded
  const includedAfterExclusion = p.includedConversionIds.filter((id) => !excluded.includes(id))
  const total = includedAfterExclusion.reduce((sum, cid) => {
    const c = db.conversions.find((x) => x.id === cid)
    return sum + (c ? c.commissionAmountCents : 0)
  }, 0)
  p.approvedAmountCents = total
  p.status = "approved"
  p.approvedByName = "Owen Marek"
  p.approvedAt = new Date().toISOString()
  p.notes = req.body?.notes ?? p.notes
  db.payments.forEach((pay) => {
    if (includedAfterExclusion.includes(pay.conversionId) && pay.affiliateId === p.affiliateId) {
      pay.status = "approved"
      pay.approvedAt = p.approvedAt
    }
  })
  p.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiPayout(p) }
})

patch("/payouts/:id/reject", (req) => {
  const db = getDb()
  const p = db.payouts.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payout not found")
  p.status = "rejected"
  p.rejectionReason = req.body?.rejection_reason || "Rejected."
  p.rejectedByName = "Owen Marek"
  p.rejectedAt = new Date().toISOString()
  p.notes = req.body?.notes ?? p.notes
  p.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiPayout(p) }
})

patch("/payouts/:id/complete", (req) => {
  const db = getDb()
  const p = db.payouts.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payout not found")
  p.status = "completed"
  p.completedAt = new Date().toISOString()
  p.notes = req.body?.notes ?? p.notes
  const included = p.includedConversionIds.filter((id) => !p.excludedConversionIds.includes(id))
  db.payments.forEach((pay) => {
    if (included.includes(pay.conversionId) && pay.affiliateId === p.affiliateId) {
      pay.status = "completed"
      pay.completedAt = p.completedAt
    }
  })
  p.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiPayout(p) }
})

patch("/payouts/:id/cancel", (req) => {
  const db = getDb()
  const p = db.payouts.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payout not found")
  p.status = "pending"
  p.approvedAmountCents = null
  p.approvedByName = null
  p.approvedAt = null
  p.notes = req.body?.notes ?? p.notes
  p.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiPayout(p) }
})
