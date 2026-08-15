import { get, post, patch, del, MockError, paginate } from "../router"
import { getDb, nextId, saveDb } from "../db"

get("/plans/default/current", () => {
  const db = getDb()
  const plan = db.plans.find((p) => p.isDefault) || db.plans[0]
  return { data: plan }
})

get("/plans/name/:name", (req) => {
  const db = getDb()
  const plan = db.plans.find((p) => p.planName.toLowerCase() === req.params.name.toLowerCase())
  if (!plan) throw new MockError(404, "NOT_FOUND", "Plan not found")
  return { data: plan }
})

get("/plans/:id", (req) => {
  const db = getDb()
  const plan = db.plans.find((p) => p.id === Number(req.params.id))
  if (!plan) throw new MockError(404, "NOT_FOUND", "Plan not found")
  return { data: plan }
})

get("/plans", (req) => {
  const db = getDb()
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items, pagination } = paginate(db.plans, page, limit)
  return { data: items, pagination }
})

post("/plans", (req) => {
  const db = getDb()
  const b = req.body || {}
  const plan = {
    id: nextId(db.plans),
    planName: b.plan_name,
    baseCommissionPercentage: b.base_commission_percentage,
    commissionDurationType: b.commission_duration_type || "lifetime",
    durationMonths: b.duration_months ?? null,
    description: b.description || null,
    isActive: b.is_active ?? true,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.plans.push(plan)
  saveDb()
  return { data: plan }
})

patch("/plans/:id/toggle", (req) => {
  const db = getDb()
  const plan = db.plans.find((p) => p.id === Number(req.params.id))
  if (!plan) throw new MockError(404, "NOT_FOUND", "Plan not found")
  plan.isActive = !plan.isActive
  saveDb()
  return { data: plan }
})

patch("/plans/:id/set-default", (req) => {
  const db = getDb()
  const plan = db.plans.find((p) => p.id === Number(req.params.id))
  if (!plan) throw new MockError(404, "NOT_FOUND", "Plan not found")
  db.plans.forEach((p) => (p.isDefault = p.id === plan.id))
  saveDb()
  return { data: plan }
})

patch("/plans/:id", (req) => {
  const db = getDb()
  const plan = db.plans.find((p) => p.id === Number(req.params.id))
  if (!plan) throw new MockError(404, "NOT_FOUND", "Plan not found")
  const b = req.body || {}
  if (b.plan_name) plan.planName = b.plan_name
  if (b.base_commission_percentage) plan.baseCommissionPercentage = b.base_commission_percentage
  if (b.commission_duration_type) plan.commissionDurationType = b.commission_duration_type
  if (b.duration_months !== undefined) plan.durationMonths = b.duration_months
  if (b.description !== undefined) plan.description = b.description
  if (b.is_active !== undefined) plan.isActive = b.is_active
  plan.updatedAt = new Date().toISOString()
  saveDb()
  return { data: plan }
})

del("/plans/:id", (req) => {
  const db = getDb()
  const idx = db.plans.findIndex((p) => p.id === Number(req.params.id))
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Plan not found")
  db.plans.splice(idx, 1)
  saveDb()
  return { message: "Plan deleted" }
})
