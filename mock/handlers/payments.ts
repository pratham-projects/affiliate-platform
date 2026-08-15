import { get, post, patch, MockError, paginate } from "../router"
import { getDb, centsToStr, saveDb, affiliateFinancials, nextId } from "../db"
import type { SeedPayment } from "../seed"

function toApiPayment(p: SeedPayment) {
  const db = getDb()
  const affiliate = db.affiliates.find((a) => a.id === p.affiliateId)
  const conversion = db.conversions.find((c) => c.id === p.conversionId)
  const site = conversion ? db.sites.find((s) => s.id === conversion.siteId) : undefined
  return {
    id: p.id,
    conversionId: p.conversionId,
    affiliateId: p.affiliateId,
    affiliateName: affiliate?.fullName || "",
    affiliateEmail: affiliate?.email || "",
    siteName: site?.name,
    siteUrl: site?.baseUrl,
    amount: centsToStr(p.amountCents),
    currency: p.currency,
    status: p.status,
    approvedBy: p.approvedAt ? 2 : null,
    approvedAt: p.approvedAt,
    rejectedBy: p.rejectedAt ? 1 : null,
    rejectedAt: p.rejectedAt,
    rejectionReason: p.rejectionReason,
    completedAt: p.completedAt,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    purchaseAmount: conversion ? centsToStr(conversion.purchaseAmountCents) : "0.00",
    conversionDate: conversion?.conversionDate || p.createdAt,
  }
}

function applyFilters(req: any, base: SeedPayment[]) {
  let items = base
  const affiliateId = req.query.get("affiliateId")
  const status = req.query.get("status")
  const startDate = req.query.get("startDate")
  const endDate = req.query.get("endDate")
  if (affiliateId) items = items.filter((p) => p.affiliateId === Number(affiliateId))
  if (status && status !== "all") items = items.filter((p) => p.status === status)
  if (startDate) items = items.filter((p) => p.createdAt >= startDate)
  if (endDate) items = items.filter((p) => p.createdAt <= endDate + "T23:59:59.999Z")
  return items
}

get("/payments/search", (req) => {
  const db = getDb()
  const items = applyFilters(req, db.payments)
  const limit = Number(req.query.get("limit") || 20)
  return { data: items.slice(0, limit).map(toApiPayment) }
})

get("/payments/stats", (req) => {
  const db = getDb()
  const affiliateId = req.query.get("affiliateId")
  const items = affiliateId ? db.payments.filter((p) => p.affiliateId === Number(affiliateId)) : db.payments
  const bucket = (status: string) => {
    const rows = items.filter((p) => p.status === status)
    return { count: rows.length, totalAmount: centsToStr(rows.reduce((s, p) => s + p.amountCents, 0)) }
  }
  return { data: { pending: bucket("pending"), approved: bucket("approved"), rejected: bucket("rejected"), completed: bucket("completed") } }
})

get("/payments/me/balance", (req) => {
  if (!req.authUser?.affiliateId) throw new MockError(403, "FORBIDDEN", "Not an affiliate session")
  const db = getDb()
  const fin = affiliateFinancials(req.authUser.affiliateId)
  const affiliate = db.affiliates.find((a) => a.id === req.authUser!.affiliateId)!
  const mine = db.payments.filter((p) => p.affiliateId === req.authUser!.affiliateId)
  const bucket = (status: string) => mine.filter((p) => p.status === status)
  const completed = bucket("completed")
  const pending = bucket("pending")
  const approved = bucket("approved")
  const rejected = bucket("rejected")
  return {
    data: {
      affiliateId: affiliate.id,
      affiliateName: affiliate.fullName,
      totalEarned: centsToStr(fin.totalEarnedCents),
      pendingBalance: centsToStr(fin.pendingBalanceCents),
      completedPayments: completed.length,
      completedAmount: centsToStr(completed.reduce((s, p) => s + p.amountCents, 0)),
      pendingPayments: pending.length,
      pendingAmount: centsToStr(pending.reduce((s, p) => s + p.amountCents, 0)),
      approvedPayments: approved.length,
      approvedAmount: centsToStr(approved.reduce((s, p) => s + p.amountCents, 0)),
      rejectedPayments: rejected.length,
      rejectedAmount: centsToStr(rejected.reduce((s, p) => s + p.amountCents, 0)),
      totalPaid: centsToStr(fin.totalPaidOutCents),
      failedPayments: 0,
      failedAmount: "0.00",
      lastPaymentAt: completed[0]?.completedAt || null,
    },
  }
})

get("/payments/me/commissions", (req) => {
  if (!req.authUser?.affiliateId) return { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
  const db = getDb()
  const mine = db.payments.filter((p) => p.affiliateId === req.authUser!.affiliateId)
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 10)
  const { items, pagination } = paginate(mine, page, limit)
  return {
    data: items.map((p) => ({ id: p.id, affiliateId: p.affiliateId, conversionId: p.conversionId, amount: centsToStr(p.amountCents), status: p.status, createdAt: p.createdAt })),
    pagination,
  }
})

get("/payments/me", (req) => {
  if (!req.authUser?.affiliateId) return { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
  const db = getDb()
  const mine = db.payments.filter((p) => p.affiliateId === req.authUser!.affiliateId)
  const items = applyFilters(req, mine).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 10)
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiPayment), pagination }
})

get("/payments/:id/details", (req) => {
  const db = getDb()
  const p = db.payments.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payment not found")
  const conversion = db.conversions.find((c) => c.id === p.conversionId)!
  const affiliate = db.affiliates.find((a) => a.id === p.affiliateId)!
  const site = db.sites.find((s) => s.id === conversion.siteId)!
  const code = db.referralCodes.find((c) => c.id === conversion.referralCodeId)
  return {
    data: {
      payment: {
        id: p.id, amount: centsToStr(p.amountCents), currency: p.currency, status: p.status,
        approvedBy: p.approvedAt ? 2 : null, approvedAt: p.approvedAt, approverName: p.approvedAt ? "Owen Marek" : null, approverEmail: p.approvedAt ? "admin@demo.local" : null,
        rejectedBy: null, rejectedAt: p.rejectedAt, rejectorName: null, rejectorEmail: null, rejectionReason: p.rejectionReason,
        completedAt: p.completedAt, notes: p.notes, createdAt: p.createdAt, updatedAt: p.updatedAt,
      },
      conversion: {
        id: conversion.id, date: conversion.conversionDate, purchaseAmount: centsToStr(conversion.purchaseAmountCents), currency: conversion.currency,
        status: conversion.status, type: conversion.conversionType, conversionType: conversion.conversionType, isTest: conversion.isTest,
        customerEmail: conversion.customerEmail, customerEmailHash: `sha256:${conversion.customerEmail.length}...demo`,
        commissionPercentage: conversion.commissionPercentage, commissionAmount: centsToStr(conversion.commissionAmountCents),
        rawPayload: { referral_code: code?.code, amount_cents: conversion.purchaseAmountCents, currency: conversion.currency },
        createdAt: conversion.createdAt, updatedAt: conversion.createdAt,
        metadata: {
          ipAddress: conversion.ipAddress, country: conversion.country, city: null, location: conversion.country,
          os: conversion.os, osVersion: null, browser: conversion.browser, browserVersion: null,
          clickReferrer: conversion.referrer, landingPage: conversion.landingPage, userAgent: null,
        },
      },
      affiliate: {
        id: affiliate.id, userId: affiliate.userId, name: affiliate.fullName, email: affiliate.email,
        status: affiliate.status === "approved" ? "active" : affiliate.status === "suspended" ? "suspended" : "inactive",
        pendingBalance: "0.00", totalEarned: "0.00",
      },
      site: { id: site.id, name: site.name, status: site.status },
      referralCode: code ? { id: code.id, code: code.code, isActive: code.isActive } : null,
    },
  }
})

get("/payments/:id", (req) => {
  const db = getDb()
  const p = db.payments.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payment not found")
  return { data: toApiPayment(p) }
})

get("/payments", (req) => {
  const db = getDb()
  const items = applyFilters(req, db.payments).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const page = Number(req.query.get("page") || 1)
  const limit = Number(req.query.get("limit") || 10)
  const { items: pageItems, pagination } = paginate(items, page, limit)
  return { data: pageItems.map(toApiPayment), pagination }
})

patch("/payments/:id", (req) => {
  const db = getDb()
  const p = db.payments.find((x) => x.id === Number(req.params.id))
  if (!p) throw new MockError(404, "NOT_FOUND", "Payment not found")
  const b = req.body || {}
  if (b.status) {
    p.status = b.status
    const now = new Date().toISOString()
    if (b.status === "approved") p.approvedAt = now
    if (b.status === "rejected") { p.rejectedAt = now; p.rejectionReason = b.reason || "Rejected by admin." }
    if (b.status === "completed") p.completedAt = now
  }
  if (b.notes !== undefined) p.notes = b.notes
  p.updatedAt = new Date().toISOString()
  saveDb()
  return { data: toApiPayment(p) }
})

post("/payments/bulk-approve", (req) => {
  const db = getDb()
  const ids: number[] = req.body?.ids || []
  let count = 0
  db.payments.forEach((p) => {
    if (ids.includes(p.id) && p.status === "pending") {
      p.status = "approved"
      p.approvedAt = new Date().toISOString()
      count++
    }
  })
  saveDb()
  return { data: { count } }
})

post("/payments/approve-all", (req) => {
  const db = getDb()
  const affiliateId = req.body?.affiliateId
  let count = 0
  db.payments.forEach((p) => {
    if (p.status === "pending" && (!affiliateId || p.affiliateId === Number(affiliateId))) {
      p.status = "approved"
      p.approvedAt = new Date().toISOString()
      count++
    }
  })
  saveDb()
  return { data: { count } }
})

post("/payments/settle-all", (req) => {
  const db = getDb()
  const affiliateId = req.body?.affiliateId
  let count = 0
  db.payments.forEach((p) => {
    if (p.status === "approved" && (!affiliateId || p.affiliateId === Number(affiliateId))) {
      p.status = "completed"
      p.completedAt = new Date().toISOString()
      count++
    }
  })
  saveDb()
  return { data: { count } }
})

post("/payments", (req) => {
  const db = getDb()
  const b = req.body || {}
  const p: SeedPayment = {
    id: nextId(db.payments),
    conversionId: 0,
    affiliateId: Number(b.affiliateId),
    amountCents: Number(b.amount_cents || 0),
    currency: "USD",
    status: "approved",
    approvedAt: new Date().toISOString(),
    rejectedAt: null,
    rejectionReason: null,
    completedAt: null,
    notes: b.notes || "Manual payment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.payments.push(p)
  saveDb()
  return { data: toApiPayment(p) }
})
