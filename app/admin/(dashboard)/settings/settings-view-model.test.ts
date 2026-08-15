import { describe, expect, it } from "bun:test"
import {
  buildSettingGroups,
  formatSettingKey,
  formatSettingValue,
} from "./settings-view-model"

describe("formatSettingKey", () => {
  it("converts snake_case keys into readable labels", () => {
    expect(formatSettingKey("default_commission_percentage")).toEqual("Default Commission Percentage")
  })
})

describe("formatSettingValue", () => {
  it("normalizes boolean values for display", () => {
    expect(formatSettingValue({ settingValue: "true", dataType: "bool" } as any)).toEqual("Enabled")
    expect(formatSettingValue({ settingValue: "false", dataType: "bool" } as any)).toEqual("Disabled")
  })

  it("returns the raw value for non-boolean settings", () => {
    expect(formatSettingValue({ settingValue: "30", dataType: "int" } as any)).toEqual("30")
  })
})

describe("buildSettingGroups", () => {
  it("keeps only non-empty categories in display order", () => {
    expect(
      buildSettingGroups({
        branding: [{ id: 1 }],
        commission: [],
        tracking: [{ id: 2 }],
        email: [],
        registration: [],
        security: [{ id: 3 }],
        currency: [],
        other: [],
      } as any),
    ).toEqual([
      { key: "branding", label: "Branding", settings: [{ id: 1 }] },
      { key: "tracking", label: "Tracking", settings: [{ id: 2 }] },
      { key: "security", label: "Security", settings: [{ id: 3 }] },
    ])
  })

  it("treats missing categories as empty groups", () => {
    expect(
      buildSettingGroups({
        branding: [{ id: 1 }],
        security: [{ id: 2 }],
      } as any),
    ).toEqual([
      { key: "branding", label: "Branding", settings: [{ id: 1 }] },
      { key: "security", label: "Security", settings: [{ id: 2 }] },
    ])
  })
})
