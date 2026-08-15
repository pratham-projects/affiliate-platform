import { get, post, patch, put, del, MockError } from "../router"
import { getDb, nextId, saveDb } from "../db"

get("/settings/exchange-rates", () => ({ data: ["USD", "EUR", "GBP"] }))

get("/settings/grouped", () => {
  const db = getDb()
  const byCategory = (cat: string) => db.settings.filter((s) => s.category === cat)
  return {
    data: {
      branding: byCategory("branding"),
      commission: byCategory("commission"),
      tracking: byCategory("tracking"),
      email: byCategory("email"),
      registration: [],
      security: byCategory("security"),
      currency: [],
      other: [],
    },
  }
})

get("/settings/:key", (req) => {
  const db = getDb()
  const s = db.settings.find((x) => x.settingKey === req.params.key)
  if (!s) throw new MockError(404, "NOT_FOUND", "Setting not found")
  return { data: s }
})

get("/settings", () => {
  const db = getDb()
  return { data: db.settings }
})

post("/settings", (req) => {
  const db = getDb()
  const b = req.body || {}
  const s = {
    id: nextId(db.settings),
    settingKey: b.setting_key,
    settingValue: b.setting_value,
    dataType: b.data_type || "string",
    description: b.description || null,
    category: "other",
    updatedAt: new Date().toISOString(),
  }
  db.settings.push(s)
  saveDb()
  return { data: s }
})

patch("/settings/batch/update", (req) => {
  const db = getDb()
  const updates: Array<{ setting_key: string; setting_value: string }> = req.body?.updates || []
  const changed: any[] = []
  updates.forEach((u) => {
    const s = db.settings.find((x) => x.settingKey === u.setting_key)
    if (s) {
      s.settingValue = u.setting_value
      s.updatedAt = new Date().toISOString()
      changed.push(s)
    }
  })
  saveDb()
  return { data: changed }
})

patch("/settings/:key", (req) => {
  const db = getDb()
  const s = db.settings.find((x) => x.settingKey === req.params.key)
  if (!s) throw new MockError(404, "NOT_FOUND", "Setting not found")
  const b = req.body || {}
  if (b.setting_value !== undefined) s.settingValue = b.setting_value
  if (b.data_type) s.dataType = b.data_type
  if (b.description !== undefined) s.description = b.description
  s.updatedAt = new Date().toISOString()
  saveDb()
  return { data: s }
})

del("/settings/:key", (req) => {
  const db = getDb()
  const idx = db.settings.findIndex((x) => x.settingKey === req.params.key)
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Setting not found")
  db.settings.splice(idx, 1)
  saveDb()
  return { message: "Setting deleted" }
})

post("/settings/initialize", () => ({ data: { created: 0 }, message: "Settings already initialized (demo)." }))

// Legacy /plans/default endpoint used by settingsService.updatePlan
put("/plans/default", (req) => {
  const db = getDb()
  const plan = db.plans.find((p) => p.isDefault) || db.plans[0]
  const b = req.body || {}
  if (b.name) plan.planName = b.name
  if (b.baseCommission !== undefined) plan.baseCommissionPercentage = String(b.baseCommission)
  saveDb()
  return { data: plan }
})
