import { describe, expect, it } from "bun:test"
import { buildAdminPayoutParams, buildPayoutSummary } from "./payouts-view-model"

describe("buildAdminPayoutParams", () => {
  it("forces pending status on the pending tab and maps affiliate filters", () => {
    expect(
      buildAdminPayoutParams({
        tab: "pending",
        status: "completed",
        affiliate: "42",
        page: 3,
        pageSize: 20,
      }),
    ).toEqual({
      page: 3,
      limit: 20,
      status: "pending",
      affiliateId: 42,
    })
  })

  it("omits all-filters on the history tab", () => {
    expect(
      buildAdminPayoutParams({
        tab: "history",
        status: "all",
        affiliate: "all",
        page: 1,
        pageSize: 20,
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      status: undefined,
      affiliateId: undefined,
    })
  })
})

describe("buildPayoutSummary", () => {
  it("counts statuses and totals requested amounts", () => {
    expect(
      buildPayoutSummary([
        { status: "pending", requestedAmount: "10.00" },
        { status: "approved", requestedAmount: "25.50" },
        { status: "completed", requestedAmount: "40.00" },
        { status: "rejected", requestedAmount: "5.25" },
      ] as any),
    ).toEqual({
      total: 4,
      pending: 1,
      approved: 1,
      completed: 1,
      rejected: 1,
      requestedAmount: 80.75,
    })
  })
})
