import { describe, expect, it } from "bun:test"
import {
  buildContactSubmitPayload,
  getContactSubmitDisabled,
  getContactTypeLabel,
} from "./contact-view-model"

describe("buildContactSubmitPayload", () => {
  it("trims the subject and message before submit", () => {
    expect(
      buildContactSubmitPayload({
        subject: "  Need help  ",
        message: "  Please call back  ",
        requestType: "technical_support",
      }),
    ).toEqual({
      subject: "Need help",
      message: "Please call back",
      requestType: "technical_support",
    })
  })
})

describe("getContactSubmitDisabled", () => {
  it("disables submit when required fields are blank or too short", () => {
    expect(getContactSubmitDisabled({ subject: "", message: "hello" })).toEqual(true)
    expect(getContactSubmitDisabled({ subject: "hello", message: "no" })).toEqual(true)
    expect(getContactSubmitDisabled({ subject: "hello", message: "valid message" })).toEqual(false)
  })
})

describe("getContactTypeLabel", () => {
  it("maps request type ids to display labels", () => {
    expect(getContactTypeLabel("general_inquiry")).toEqual("General Inquiry")
    expect(getContactTypeLabel("technical_support")).toEqual("Technical Support")
  })
})
