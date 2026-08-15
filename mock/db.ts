// In-memory demo database. Built once per page load from the deterministic
// seed, then mutated in place by the mock handlers (create/edit/delete really
// work for the length of a session). Mirrored to sessionStorage so a refresh
// doesn't lose the session's edits — "Reset demo data" in the demo badge
// clears that mirror and rebuilds fresh from the seed.

import { buildSeed, type DemoDb, centsToStr } from "./seed"

const STORAGE_KEY = "affiliate_demo_db_v1"

let db: DemoDb | null = null

function loadFromStorage(): DemoDb | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DemoDb
  } catch {
    return null
  }
}

function persist() {
  if (typeof window === "undefined" || !db) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // storage full / unavailable — demo still works in-memory for this load
  }
}

export function getDb(): DemoDb {
  if (db) return db
  db = loadFromStorage() || buildSeed()
  persist()
  return db
}

export function resetDb(): DemoDb {
  db = buildSeed()
  persist()
  return db
}

export function saveDb() {
  persist()
}

export function nextId(rows: Array<{ id: number }>): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

// ---------- derived financial helpers (kept in one place so every screen
// that shows money agrees with every other screen) ----------

export function affiliateFinancials(affiliateId: number) {
  const store = getDb()
  const approvedConversions = store.conversions.filter(
    (c) => c.affiliateId === affiliateId && c.status === "approved"
  )
  const totalEarnedCents = approvedConversions.reduce((sum, c) => sum + c.commissionAmountCents, 0)
  const paidPayments = store.payments.filter((p) => p.affiliateId === affiliateId && p.status === "completed")
  const totalPaidOutCents = paidPayments.reduce((sum, p) => sum + p.amountCents, 0)
  const pendingBalanceCents = totalEarnedCents - totalPaidOutCents
  return { totalEarnedCents, totalPaidOutCents, pendingBalanceCents }
}

export function affiliateConversionStats(affiliateId: number) {
  const store = getDb()
  const all = store.conversions.filter((c) => c.affiliateId === affiliateId)
  const approved = all.filter((c) => c.status === "approved")
  const pending = all.filter((c) => c.status === "pending")
  const rejected = all.filter((c) => c.status === "rejected")
  const chargeback = all.filter((c) => c.status === "chargeback")
  const codes = store.referralCodes.filter((c) => c.affiliateId === affiliateId)
  const totalClicks = codes.reduce((s, c) => s + c.totalClicks, 0)
  return {
    total: all.length,
    approved: approved.length,
    pending: pending.length,
    rejected: rejected.length,
    chargeback: chargeback.length,
    totalClicks,
    conversionRate: totalClicks > 0 ? ((approved.length / totalClicks) * 100) : 0,
  }
}

export function affiliatePendingBalanceStr(affiliateId: number): string {
  return centsToStr(affiliateFinancials(affiliateId).pendingBalanceCents)
}

export { centsToStr }
export type { DemoDb }
