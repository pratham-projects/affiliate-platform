import { get, patch, del, MockError, paginate } from "../router"
import { getDb, saveDb } from "../db"

function scoped(req: any) {
  const db = getDb()
  const userId = req.authUser?.userId
  return db.notifications.filter((n) => n.userId === userId)
}

get("/notifications/unread-count", (req) => {
  const items = scoped(req)
  return { data: { unreadCount: items.filter((n) => !n.isRead).length } }
})

get("/notifications", (req) => {
  const items = scoped(req)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 20)
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems, pagination }
})

patch("/notifications/read-all", (req) => {
  const db = getDb()
  db.notifications.forEach((n) => {
    if (n.userId === req.authUser?.userId) n.isRead = true
  })
  saveDb()
  return { message: "All notifications marked as read" }
})

patch("/notifications/:id/read", (req) => {
  const db = getDb()
  const n = db.notifications.find((x) => x.id === Number(req.params.id))
  if (!n) throw new MockError(404, "NOT_FOUND", "Notification not found")
  n.isRead = true
  saveDb()
  return { data: n }
})

del("/notifications/read", (req) => {
  const db = getDb()
  db.notifications = db.notifications.filter((n) => !(n.userId === req.authUser?.userId && n.isRead))
  saveDb()
  return { message: "Read notifications deleted" }
})

del("/notifications/:id", (req) => {
  const db = getDb()
  const idx = db.notifications.findIndex((x) => x.id === Number(req.params.id))
  if (idx === -1) throw new MockError(404, "NOT_FOUND", "Notification not found")
  db.notifications.splice(idx, 1)
  saveDb()
  return { message: "Notification deleted" }
})
