export function buildAssignmentFilters({
  affiliateId,
  relatedId,
  active,
}: {
  affiliateId: string
  relatedId: string
  active: string
}) {
  return {
    ...(affiliateId !== "all" ? { affiliateId: Number(affiliateId) } : {}),
    ...(relatedId !== "all" ? { relatedId: Number(relatedId) } : {}),
    ...(active !== "all" ? { isActive: active === "true" } : {}),
  }
}

export function formatAssignmentDuration(durationType: string | null, durationMonths: number | null) {
  if (!durationType) {
    return "Plan default"
  }

  switch (durationType) {
    case "one_month":
      return "One month"
    case "lifetime":
      return "Lifetime"
    case "x_months":
      return durationMonths ? `${durationMonths} months` : "Custom months"
    default:
      return durationType.replaceAll("_", " ")
  }
}

export function toStoredCommissionPercentage(value: string) {
  return Math.round(Number.parseFloat(value) * 100).toString()
}

export function fromStoredCommissionPercentage(value: string | null) {
  if (!value) {
    return ""
  }

  return `${Number.parseInt(value, 10) / 100}`.replace(/\.0$/, "")
}
