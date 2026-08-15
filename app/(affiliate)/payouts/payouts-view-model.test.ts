import { describe, expect, it } from "bun:test"
import {
  buildAffiliatePayoutStats,
  getAffiliatePayoutDetailMeta,
  getPayoutRequestEnabled,
} from "./payouts-view-model"

describe("buildAffiliatePayoutStats", () => {
  it("maps payout balance data into four summary cards", () => {
    expect(
      buildAffiliatePayoutStats({
        availableBalance: "12550",
        currency: "USD",
        totalEarned: "80000",
        totalPaidOut: "50000",
        pendingPayouts: "17450",
        salesBreakdown: [],
      }),
    ).toEqual([
      { key: "total-earned", label: "Total earned", value: "$800.00", hint: "Approved commissions" },
      { key: "paid-out", label: "Paid out", value: "$500.00", hint: "Completed payouts" },
      { key: "pending", label: "Pending payouts", value: "$174.50", hint: "Already requested" },
      { key: "available", label: "Available balance", value: "$125.50", hint: "Ready to request" },
    ])
  })
})

describe("getPayoutRequestEnabled", () => {
  it("allows requesting only when available balance is greater than zero", () => {
    expect(getPayoutRequestEnabled({ availableBalance: "1000" })).toEqual(true)
    expect(getPayoutRequestEnabled({ availableBalance: "0" })).toEqual(false)
    expect(getPayoutRequestEnabled(null)).toEqual(false)
  })
})

describe("getAffiliatePayoutDetailMeta", () => {
  it("returns read-only payout metadata rows for the affiliate detail screen", () => {
    expect(
      getAffiliatePayoutDetailMeta({
        id: 18,
        status: "approved",
        requestedAmount: "10000",
        approvedAmount: "9500",
        currency: "USD",
        notes: "Reviewed",
        createdAt: "2026-06-20T10:30:00.000Z",
        updatedAt: "2026-06-21T12:00:00.000Z",
        approvedAt: "2026-06-21T12:00:00.000Z",
        completedAt: null,
      } as any),
    ).toEqual([
      { label: "Request ID", value: "#18" },
      { label: "Requested amount", value: "$100.00" },
      { label: "Approved amount", value: "$95.00" },
      { label: "Created", value: "20/06/2026, 10:30" },
      { label: "Updated", value: "21/06/2026, 12:00" },
      { label: "Approved at", value: "21/06/2026, 12:00" },
      { label: "Completed at", value: "Not completed yet" },
      { label: "Notes", value: "Reviewed" },
    ])
  })
})
