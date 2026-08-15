import { describe, expect, it } from "bun:test"
import {
  buildAdminPaymentParams,
  getPaymentAmount,
  getPaymentDate,
} from "./payments-view-model"

describe("buildAdminPaymentParams", () => {
  it("forces pending status on the pending tab", () => {
    expect(
      buildAdminPaymentParams({
        status: "completed",
        affiliateId: "17",
        page: 2,
        pageSize: 25,
        tab: "pending",
      }),
    ).toEqual({
      page: 2,
      limit: 25,
      affiliateId: 17,
      status: "pending",
    })
  })

  it("omits all filters on the history tab", () => {
    expect(
      buildAdminPaymentParams({
        status: "all",
        affiliateId: "all",
        page: 1,
        pageSize: 20,
        tab: "history",
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      affiliateId: undefined,
      status: undefined,
    })
  })
})

describe("payment helpers", () => {
  it("reads fallback amount and date fields", () => {
    expect(getPaymentAmount({ amount: "", amountPaid: "12.00" } as any)).toEqual("12.00")
    expect(getPaymentDate({ createdAt: "", paymentDate: "2026-06-27T10:00:00.000Z" } as any)).toEqual(
      "2026-06-27T10:00:00.000Z",
    )
  })
})
