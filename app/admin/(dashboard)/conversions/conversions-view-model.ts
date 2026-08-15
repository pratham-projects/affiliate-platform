import type { Conversion, ConversionsParams } from "@/lib/api/conversions"

type ConversionFilterState = {
  status: string
  affiliate: string
  site: string
  conversionType: string
  startDate: string
  endDate: string
  search: string
  page: number
  pageSize: number
}

function nullableStringFilter(value: string) {
  return value && value !== "all" ? value : undefined
}

function nullableNumberFilter(value: string) {
  const normalized = nullableStringFilter(value)
  return normalized ? Number(normalized) : undefined
}

export function buildAdminConversionParams(filters: ConversionFilterState): ConversionsParams {
  return {
    page: filters.page,
    limit: filters.pageSize,
    status: nullableStringFilter(filters.status),
    affiliateId: nullableNumberFilter(filters.affiliate),
    siteId: nullableNumberFilter(filters.site),
    conversionType: nullableStringFilter(filters.conversionType),
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    search: filters.search.trim() || undefined,
  }
}

export function getConversionCustomerEmail(conversion: Conversion) {
  return (
    conversion.customerEmail ||
    conversion.rawPayload?.customer_email ||
    conversion.rawPayload?.email ||
    conversion.rawPayload?.customer?.email ||
    "Unavailable"
  )
}
