import type { ConversionType } from "@/lib/api/conversion-types"

export function buildConversionTypeSummary(conversionTypes: ConversionType[]) {
  const active = conversionTypes.filter((conversionType) => conversionType.isActive).length

  return {
    total: conversionTypes.length,
    active,
    inactive: conversionTypes.length - active,
  }
}

export function validateConversionTypeForm({ name }: { name: string }) {
  if (!name.trim()) {
    return {
      name: "Conversion type name is required",
    }
  }

  return {}
}
