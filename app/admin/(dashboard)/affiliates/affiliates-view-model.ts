type AffiliateStatus = "all" | "pending" | "approved" | "rejected" | "suspended" | "deleted"

export function buildAffiliateFilters({
  page,
  pageSize,
  status,
}: {
  page: number
  pageSize: number
  status: AffiliateStatus
}) {
  return {
    page,
    limit: pageSize,
    ...(status !== "all" ? { status } : {}),
  }
}

export function formatAffiliateContact(platform: string | null, identifier: string | null) {
  if (!platform || !identifier) {
    return "Not provided"
  }

  const label = platform.charAt(0).toUpperCase() + platform.slice(1)
  return `${label}: ${identifier}`
}

export function getAffiliatePrimaryAction(status: Exclude<AffiliateStatus, "all">) {
  switch (status) {
    case "pending":
      return "Approve"
    case "approved":
      return "Suspend"
    case "suspended":
      return "Reactivate"
    case "rejected":
      return "Approve"
    case "deleted":
    default:
      return "View"
  }
}
