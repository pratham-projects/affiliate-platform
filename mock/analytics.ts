// Shared aggregation for every analytics/reports breakdown. Every row is
// computed straight from the conversion list (optionally scoped to one
// affiliate), so referrer/os/browser/country/device breakdowns always sum to
// the same click and conversion totals as each other and as the dashboard.

import { getDb, centsToStr } from "./db"
import type { SeedConversion } from "./seed"

export type Dimension = "referrer" | "os" | "browser" | "country" | "deviceType"

export interface BreakdownRow {
  key: string
  totalClicks: number
  totalCustomers: number
  totalConversions: number
  totalConversionAmount: string
  totalCommission: string
}

function scopedClicks(affiliateId?: number): number {
  const db = getDb()
  const codes = affiliateId ? db.referralCodes.filter((c) => c.affiliateId === affiliateId) : db.referralCodes
  return codes.reduce((s, c) => s + c.totalClicks, 0)
}

export function scopedConversions(affiliateId?: number): SeedConversion[] {
  const db = getDb()
  return affiliateId ? db.conversions.filter((c) => c.affiliateId === affiliateId) : db.conversions
}

export function buildBreakdown(dimension: Dimension, affiliateId?: number): BreakdownRow[] {
  const conversions = scopedConversions(affiliateId)
  const totalClicks = scopedClicks(affiliateId)
  const totalConversionsCount = conversions.length || 1

  const groups = new Map<string, SeedConversion[]>()
  conversions.forEach((c) => {
    const key = c[dimension]
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  })

  const entries = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)
  let clicksAssigned = 0
  const rows: BreakdownRow[] = entries.map(([key, rows], idx) => {
    const isLast = idx === entries.length - 1
    const share = isLast
      ? totalClicks - clicksAssigned
      : Math.round((rows.length / totalConversionsCount) * totalClicks)
    clicksAssigned += share
    const uniqueCustomers = new Set(rows.map((r) => r.customerEmail)).size
    return {
      key,
      totalClicks: Math.max(share, rows.length),
      totalCustomers: uniqueCustomers,
      totalConversions: rows.length,
      totalConversionAmount: centsToStr(rows.reduce((s, r) => s + r.purchaseAmountCents, 0)),
      totalCommission: centsToStr(rows.reduce((s, r) => s + r.commissionAmountCents, 0)),
    }
  })
  return rows
}

export function totalClicksForScope(affiliateId?: number): number {
  return scopedClicks(affiliateId)
}

// Daily trend series over the full seed window for a metric, bucketed by day.
export function buildTrend(metric: "conversions" | "revenue" | "commission" | "clicks", days: number, affiliateId?: number) {
  const db = getDb()
  const conversions = scopedConversions(affiliateId)
  const byDay = new Map<string, SeedConversion[]>()
  conversions.forEach((c) => {
    const day = c.conversionDate.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(c)
  })

  const totalClicksScope = scopedClicks(affiliateId)
  const totalConversionsScope = conversions.length || 1

  const out: { date: string; value: number }[] = []
  const now = new Date(db.meta.generatedAt)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayConversions = byDay.get(key) || []
    let value = 0
    if (metric === "conversions") value = dayConversions.length
    else if (metric === "revenue") value = dayConversions.reduce((s, c) => s + c.purchaseAmountCents, 0) / 100
    else if (metric === "commission") value = dayConversions.reduce((s, c) => s + c.commissionAmountCents, 0) / 100
    else if (metric === "clicks") value = Math.round((dayConversions.length / totalConversionsScope) * totalClicksScope)
    out.push({ date: key, value })
  }
  return out
}
