import type { GroupedSettings, Setting } from "@/lib/api/settings"

const SETTING_GROUP_ORDER = [
  "branding",
  "commission",
  "tracking",
  "email",
  "registration",
  "security",
  "currency",
  "other",
] as const

type SettingGroupKey = (typeof SETTING_GROUP_ORDER)[number]

export function formatSettingKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function formatSettingValue(setting: Pick<Setting, "settingValue" | "dataType">) {
  if (setting.dataType === "bool") {
    return setting.settingValue === "true" ? "Enabled" : "Disabled"
  }

  return setting.settingValue
}

export function buildSettingGroups(groupedSettings: Partial<GroupedSettings>) {
  return SETTING_GROUP_ORDER.flatMap((key) => {
    const settings = groupedSettings[key] ?? []

    if (!settings.length) {
      return []
    }

    return [
      {
        key,
        label: formatSettingKey(key),
        settings,
      },
    ]
  })
}

export function getSettingTypeLabel(type: Setting["dataType"]) {
  switch (type) {
    case "bool":
      return "Boolean"
    case "int":
      return "Integer"
    case "float":
      return "Float"
    case "json":
      return "JSON"
    case "string":
    default:
      return "String"
  }
}

export function getSettingTypeVariant(type: Setting["dataType"]) {
  const variants: Record<Setting["dataType"], "default" | "secondary" | "outline"> = {
    string: "secondary",
    int: "outline",
    float: "outline",
    bool: "default",
    json: "secondary",
  }

  return variants[type]
}
