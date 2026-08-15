import type { Site } from "@/lib/api/sites"

interface SiteFilterState {
  page: number
  pageSize: number
  status: "all" | Site["status"]
}

interface SiteFormValues {
  name: string
  baseUrl: string
}

export function buildSiteFilters(filters: SiteFilterState) {
  return {
    page: filters.page,
    limit: filters.pageSize,
    ...(filters.status !== "all" ? { status: filters.status } : {}),
  }
}

export function validateSiteForm(values: SiteFormValues) {
  const errors: { name?: string; baseUrl?: string } = {}

  if (!values.name.trim()) {
    errors.name = "Site name is required"
  } else if (values.name.trim().length < 2) {
    errors.name = "Site name must be at least 2 characters"
  }

  if (!values.baseUrl.trim()) {
    errors.baseUrl = "Base URL is required"
  } else if (!values.baseUrl.startsWith("http://") && !values.baseUrl.startsWith("https://")) {
    errors.baseUrl = "Must be a valid URL (http:// or https://)"
  } else {
    try {
      new URL(values.baseUrl)
    } catch {
      errors.baseUrl = "Must be a valid URL"
    }
  }

  return errors
}

export function getSiteStatusActionLabel(status: Site["status"]) {
  return status === "active" ? "Deactivate" : "Activate"
}
