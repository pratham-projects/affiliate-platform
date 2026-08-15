import { get, post, patch, del, MockError, paginate } from "../router"
import { getDb, nextId, saveDb } from "../db"

function toApiPlanAssignment(pa: any) {
  const db = getDb()
  const affiliate = db.affiliates.find((a) => a.id === pa.affiliateId)
  const plan = db.plans.find((p) => p.id === pa.planId)
  return {
    id: pa.id,
    affiliateId: pa.affiliateId,
    affiliateName: affiliate?.fullName || "",
    planId: pa.planId,
    planName: plan?.planName || "",
    customCommissionOverride: pa.customCommissionOverride,
    customDurationOverride: pa.customDurationOverride,
    customDurationMonths: pa.customDurationMonths,
    isActive: pa.isActive,
    createdAt: pa.createdAt,
    updatedAt: pa.updatedAt,
  }
}

function toApiSiteAssignment(sa: any) {
  const db = getDb()
  const affiliate = db.affiliates.find((a) => a.id === sa.affiliateId)
  const site = db.sites.find((s) => s.id === sa.siteId)
  return {
    id: sa.id,
    affiliateId: sa.affiliateId,
    affiliateName: affiliate?.fullName || "",
    siteId: sa.siteId,
    siteName: site?.name || "",
    isActive: sa.isActive,
    createdAt: sa.createdAt,
    updatedAt: sa.updatedAt,
  }
}

get("/assignments/plans/:id/effective-commission", (req) => {
  const db = getDb()
  const pa = db.planAssignments.find((p) => p.id === Number(req.params.id))
  if (!pa) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  const plan = db.plans.find((p) => p.id === pa.planId)!
  const effective = pa.customCommissionOverride || plan.baseCommissionPercentage
  return {
    data: {
      affiliateId: pa.affiliateId,
      planId: pa.planId,
      effectiveCommission: effective,
      durationType: pa.customDurationOverride || plan.commissionDurationType,
      durationMonths: pa.customDurationMonths ?? plan.durationMonths,
      source: pa.customCommissionOverride ? "custom" : "plan",
    },
  }
})

get("/assignments/plans/:id", (req) => {
  const db = getDb()
  const pa = db.planAssignments.find((p) => p.id === Number(req.params.id))
  if (!pa) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  return { data: toApiPlanAssignment(pa) }
})

get("/assignments/plans", (req) => {
  const db = getDb()
  let items = db.planAssignments.slice()
  const affiliateId = req.query.get("affiliateId")
  const planId = req.query.get("planId")
  const isActive = req.query.get("isActive")
  if (affiliateId) items = items.filter((p) => p.affiliateId === Number(affiliateId))
  if (planId) items = items.filter((p) => p.planId === Number(planId))
  if (isActive !== null) items = items.filter((p) => p.isActive === (isActive === "true"))
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiPlanAssignment), pagination }
})

post("/assignments/plans", (req) => {
  const db = getDb()
  const b = req.body || {}
  const pa = {
    id: nextId(db.planAssignments),
    affiliateId: Number(b.affiliate_id),
    planId: Number(b.plan_id),
    customCommissionOverride: b.custom_commission_override || null,
    customDurationOverride: b.custom_duration_override || null,
    customDurationMonths: b.custom_duration_months ?? null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.planAssignments.push(pa)
  saveDb()
  return { data: toApiPlanAssignment(pa) }
})

patch("/assignments/plans/:id/toggle", (req) => {
  const db = getDb()
  const pa = db.planAssignments.find((p) => p.id === Number(req.params.id))
  if (!pa) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  pa.isActive = !pa.isActive
  saveDb()
  return { data: toApiPlanAssignment(pa) }
})

patch("/assignments/plans/:id", (req) => {
  const db = getDb()
  const pa = db.planAssignments.find((p) => p.id === Number(req.params.id))
  if (!pa) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  const b = req.body || {}
  if (b.custom_commission_override !== undefined) pa.customCommissionOverride = b.custom_commission_override
  if (b.custom_duration_override !== undefined) pa.customDurationOverride = b.custom_duration_override
  if (b.custom_duration_months !== undefined) pa.customDurationMonths = b.custom_duration_months
  pa.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiPlanAssignment(pa) }
})

del("/assignments/plans/:affiliateId/:planId", (req) => {
  const db = getDb()
  const idx = db.planAssignments.findIndex(
    (p) => p.affiliateId === Number(req.params.affiliateId) && p.planId === Number(req.params.planId)
  )
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  db.planAssignments.splice(idx, 1)
  saveDb()
  return { message: "Assignment removed" }
})

get("/assignments/sites", (req) => {
  const db = getDb()
  let items = db.siteAssignments.slice()
  const affiliateId = req.query.get("affiliateId")
  const siteId = req.query.get("siteId")
  const isActive = req.query.get("isActive")
  if (affiliateId) items = items.filter((p) => p.affiliateId === Number(affiliateId))
  if (siteId) items = items.filter((p) => p.siteId === Number(siteId))
  if (isActive !== null) items = items.filter((p) => p.isActive === (isActive === "true"))
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiSiteAssignment), pagination }
})

post("/assignments/sites", (req) => {
  const db = getDb()
  const b = req.body || {}
  const sa = {
    id: nextId(db.siteAssignments),
    affiliateId: Number(b.affiliate_id),
    siteId: Number(b.site_id),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.siteAssignments.push(sa)
  saveDb()
  return { data: toApiSiteAssignment(sa) }
})

patch("/assignments/sites/:id/toggle", (req) => {
  const db = getDb()
  const sa = db.siteAssignments.find((p) => p.id === Number(req.params.id))
  if (!sa) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  sa.isActive = !sa.isActive
  saveDb()
  return { data: toApiSiteAssignment(sa) }
})

del("/assignments/sites/:affiliateId/:siteId", (req) => {
  const db = getDb()
  const idx = db.siteAssignments.findIndex(
    (p) => p.affiliateId === Number(req.params.affiliateId) && p.siteId === Number(req.params.siteId)
  )
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Assignment not found")
  db.siteAssignments.splice(idx, 1)
  saveDb()
  return { message: "Assignment removed" }
})
