import { get, post, patch, del, MockError } from "../router"
import { getDb, nextId, saveDb } from "../db"

get("/conversion-types", () => {
  const db = getDb()
  return { data: db.conversionTypes }
})

get("/conversion-types/:id", (req) => {
  const db = getDb()
  const ct = db.conversionTypes.find((c) => c.id === Number(req.params.id))
  if (!ct) throw new MockError(404, "NOT_FOUND", "Conversion type not found")
  return { data: ct }
})

post("/conversion-types", (req) => {
  const db = getDb()
  const { name, description, isActive } = req.body || {}
  const ct = {
    id: nextId(db.conversionTypes),
    name,
    description: description || null,
    isActive: isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.conversionTypes.push(ct)
  saveDb()
  return { data: ct }
})

patch("/conversion-types/:id", (req) => {
  const db = getDb()
  const ct = db.conversionTypes.find((c) => c.id === Number(req.params.id))
  if (!ct) throw new MockError(404, "NOT_FOUND", "Conversion type not found")
  Object.assign(ct, req.body || {})
  ct.updatedAt = new Date().toISOString()
  saveDb()
  return { data: ct }
})

del("/conversion-types/:id", (req) => {
  const db = getDb()
  const idx = db.conversionTypes.findIndex((c) => c.id === Number(req.params.id))
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Conversion type not found")
  db.conversionTypes.splice(idx, 1)
  saveDb()
  return { message: "Conversion type deleted" }
})
