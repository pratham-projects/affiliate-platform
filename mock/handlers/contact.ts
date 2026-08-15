import { get, post, patch, del, MockError, paginate } from "../router"
import { getDb, nextId, saveDb } from "../db"

get("/contact/my-requests", (req) => {
  if (!req.authUser?.affiliateId) return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
  const db = getDb()
  const items = db.contactRequests
    .filter((c) => c.affiliateId === req.authUser!.affiliateId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems, pagination }
})

get("/contact", (req) => {
  const db = getDb()
  let items = db.contactRequests.slice()
  const status = req.query.get("status")
  const requestType = req.query.get("requestType")
  if (status && status !== "all") items = items.filter((c) => c.status === status)
  if (requestType && requestType !== "all") items = items.filter((c) => c.requestType === requestType)
  items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const limit = Number(req.query.get("limit") || 10)
  const offset = Number(req.query.get("offset") || 0)
  const page = Math.floor(offset / limit) + 1
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems, pagination }
})

post("/contact", (req) => {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  const db = getDb()
  const affiliate = db.affiliates.find((a) => a.id === req.authUser!.affiliateId)!
  const b = req.body || {}
  const cr = {
    id: nextId(db.contactRequests),
    affiliateId: affiliate.id,
    affiliateName: affiliate.fullName,
    affiliateEmail: affiliate.email,
    subject: b.subject,
    message: b.message,
    requestType: b.requestType || "general_inquiry",
    amount: b.amount !== undefined ? String(b.amount) : null,
    currency: b.currency || "USD",
    status: "pending" as const,
    adminNotes: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    resolvedAt: null,
  }
  db.contactRequests.push(cr)
  saveDb()
  return { data: cr }
})

patch("/contact/:id/status", (req) => {
  const db = getDb()
  const cr = db.contactRequests.find((c) => c.id === Number(req.params.id))
  if (!cr) throw new MockError(404, "NOT_FOUND", "Request not found")
  const b = req.body || {}
  if (b.status) cr.status = b.status
  if (b.adminNotes !== undefined) cr.adminNotes = b.adminNotes
  cr.updatedAt = new Date().toISOString()
  if (b.status === "resolved") cr.resolvedAt = cr.updatedAt
  saveDb()
  return { data: cr }
})

del("/contact/:id", (req) => {
  const db = getDb()
  const idx = db.contactRequests.findIndex((c) => c.id === Number(req.params.id))
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Request not found")
  db.contactRequests.splice(idx, 1)
  saveDb()
  return { message: "Request deleted" }
})
