"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CheckCircle2, Eye, RotateCcw, XCircle } from "lucide-react"
import {
  AsyncBoundary,
  DataTable,
  DataTablePagination,
  DetailRow,
  DetailSheet,
  FilterBar,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNotification } from "@/components/ui/notification"
import { SearchDropdown, type SearchDropdownOption } from "@/components/ui/search-dropdown"
import { isAdmin, useAuth } from "@/lib/auth-context"
import {
  affiliatesService,
  conversionTypesService,
  conversionsService,
  sitesService,
  type Conversion,
  type ConversionType,
} from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { mapAffiliateToOption, mapSiteToOption } from "@/lib/utils/search-mapping"
import {
  buildAdminConversionParams,
  getConversionCustomerEmail,
} from "./conversions-view-model"

const INITIAL_FILTERS = {
  status: "all",
  affiliate: "all",
  site: "all",
  conversionType: "all",
  startDate: "",
  endDate: "",
  search: "",
  page: 1,
  pageSize: 20,
}

export default function ConversionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { success, error: notifyError } = useNotification()
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")
  const conversionTypeFetchRef = useRef(false)

  const [conversions, setConversions] = useState<Conversion[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedConversion, setSelectedConversion] = useState<Conversion | null>(null)
  const [conversionTypes, setConversionTypes] = useState<ConversionType[]>([])
  const [affiliateOptions, setAffiliateOptions] = useState<SearchDropdownOption[]>([])
  const [siteOptions, setSiteOptions] = useState<SearchDropdownOption[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const fetchConversions = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await conversionsService.getAll(buildAdminConversionParams(filters))
        setConversions(response.conversions)
        setTotal(response.pagination.total)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [filters],
  )

  useEffect(() => {
    if (conversionTypeFetchRef.current) return
    conversionTypeFetchRef.current = true

    conversionTypesService
      .getAll()
      .then(setConversionTypes)
      .catch(() => setConversionTypes([]))
  }, [])

  useEffect(() => {
    if (!filters.startDate) {
      setDateRange(undefined)
      return
    }

    setDateRange({
      from: new Date(filters.startDate),
      to: filters.endDate ? new Date(filters.endDate) : new Date(filters.startDate),
    })
  }, [filters.endDate, filters.startDate])

  useEffect(() => {
    if (filters.affiliate === "all") return

    affiliatesService
      .getById(Number(filters.affiliate))
      .then((affiliate) => {
        if (!affiliate) return
        setAffiliateOptions((current) => {
          if (current.some((option) => option.value === String(affiliate.id))) return current
          return [...current, mapAffiliateToOption(affiliate)]
        })
      })
      .catch(() => undefined)
  }, [filters.affiliate])

  useEffect(() => {
    if (filters.site === "all") return

    sitesService
      .getById(Number(filters.site))
      .then((site) => {
        if (!site) return
        setSiteOptions((current) => {
          if (current.some((option) => option.value === String(site.id))) return current
          return [...current, mapSiteToOption(site as never)]
        })
      })
      .catch(() => undefined)
  }, [filters.site])

  useEffect(() => {
    if (authLoading || !isAdmin(user?.role)) return

    const fetchKey = JSON.stringify(buildAdminConversionParams(filters))
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchConversions()
  }, [authLoading, fetchConversions, filters, user?.role])

  const handleAffiliateSearch = async (query: string) => {
    try {
      const results = await affiliatesService.search({ q: query, status: "approved" })
      setAffiliateOptions(results.map(mapAffiliateToOption))
    } catch {
      setAffiliateOptions([])
    }
  }

  const handleSiteSearch = async (query: string) => {
    try {
      const results = await sitesService.search({ q: query })
      setSiteOptions(results.map(mapSiteToOption))
    } catch {
      setSiteOptions([])
    }
  }

  const handleStatusChange = async (
    conversion: Conversion,
    status: "approved" | "rejected" | "chargeback",
  ) => {
    try {
      const updated = await conversionsService.updateStatus(conversion.id, status)
      setConversions((current) => current.map((item) => (item.id === conversion.id ? updated : item)))
      if (selectedConversion?.id === conversion.id) {
        setSelectedConversion(updated)
      }
      success(`Conversion ${status}`)
    } catch (updateError) {
      notifyError(parseApiError(updateError).message)
    }
  }

  const columns: Column<Conversion>[] = useMemo(
    () => [
      {
        key: "site",
        header: "Site",
        cell: (conversion) => (
          <div className="space-y-1">
            <div className="font-medium">{conversion.siteName}</div>
            <div className="text-xs text-muted-foreground">{conversion.siteUrl || "No URL"}</div>
          </div>
        ),
      },
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (conversion) => (
          <div className="space-y-1">
            <div className="font-medium">{conversion.affiliateName}</div>
            <div className="text-xs text-muted-foreground">{conversion.affiliateEmail || "No email"}</div>
          </div>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        cell: (conversion) => getConversionCustomerEmail(conversion),
      },
      {
        key: "date",
        header: "Date",
        cell: (conversion) => (
          <div className="space-y-1">
            <div>{formatDate(conversion.conversionDate)}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(conversion.conversionDate)}</div>
          </div>
        ),
      },
      {
        key: "purchase",
        header: "Purchase",
        cell: (conversion) => formatCurrency(conversion.purchaseAmount, conversion.currency ?? undefined),
      },
      {
        key: "commission",
        header: "Commission",
        cell: (conversion) => (
          <div className="space-y-1">
            <div className="font-medium">
              {formatCurrency(conversion.commissionAmount, conversion.currency ?? undefined)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatPercent(conversion.commissionPercentage)}
            </div>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        cell: (conversion) => conversion.conversionType || "Unknown",
      },
      {
        key: "status",
        header: "Status",
        cell: (conversion) => <StatusBadge status={conversion.status} />,
      },
      {
        key: "actions",
        header: "",
        className: "w-[120px] text-right",
        cell: (conversion) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/conversions/${conversion.id}`}>
                <Eye className="size-4" />
                Open
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedConversion(conversion)}>
                  <Eye className="size-4" />
                  Quick view
                </DropdownMenuItem>
                {conversion.status === "pending" ? (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange(conversion, "approved")}>
                      <CheckCircle2 className="size-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(conversion, "rejected")}>
                      <XCircle className="size-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                ) : null}
                {conversion.status === "approved" ? (
                  <DropdownMenuItem onClick={() => handleStatusChange(conversion, "chargeback")}>
                    <RotateCcw className="size-4" />
                    Chargeback
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleStatusChange],
  )

  if (authLoading) {
    return <TableSkeleton rows={8} columns={8} />
  }

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversions"
        description="Review recorded conversions, affiliate attribution, and approval status."
        onRefresh={() => fetchConversions(true)}
        isRefreshing={isRefreshing}
      />

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base font-semibold">Conversion Queue</CardTitle>
          <FilterBar
            search={filters.search}
            onSearchChange={(value) => setFilter("search", value)}
            searchPlaceholder="Search customer email or order details..."
          >
            <SearchDropdown
              value={filters.affiliate}
              onChange={(value) => setFilters({ affiliate: value || "all", page: 1 })}
              options={affiliateOptions}
              onSearch={handleAffiliateSearch}
              placeholder="Affiliate"
              allowClear
            />
            <SearchDropdown
              value={filters.site}
              onChange={(value) => setFilters({ site: value || "all", page: 1 })}
              options={siteOptions}
              onSearch={handleSiteSearch}
              placeholder="Site"
              allowClear
            />
            <Select value={filters.status} onValueChange={(value) => setFilters({ status: value, page: 1 })}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="chargeback">Chargeback</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.conversionType}
              onValueChange={(value) => setFilters({ conversionType: value, page: 1 })}
            >
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {conversionTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range)
                setFilters({
                  startDate: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  endDate: range?.from ? format(range.to ?? range.from, "yyyy-MM-dd") : "",
                  page: 1,
                })
              }}
              placeholder="Date range"
              className="w-full sm:w-[240px]"
            />
          </FilterBar>
        </CardHeader>
        <CardContent className="space-y-4">
          <AsyncBoundary
            loading={isLoading}
            error={error}
            isEmpty={!conversions.length}
            loadingFallback={<TableSkeleton rows={8} columns={9} />}
            onRetry={() => fetchConversions()}
            emptyTitle="No conversions found"
            emptyDescription="Adjust the filters or wait for new conversions to arrive."
          >
            <>
              <DataTable
                columns={columns}
                data={conversions}
                rowKey={(conversion) => conversion.id}
                onRowClick={(conversion) => {
                  setSelectedConversion(null)
                  window.location.href = `/admin/conversions/${conversion.id}`
                }}
              />
              <DataTablePagination
                page={filters.page}
                pageSize={filters.pageSize}
                total={total}
                onPageChange={(page) => setFilter("page", page)}
                className="pt-2"
              />
            </>
          </AsyncBoundary>
        </CardContent>
      </Card>

      <DetailSheet
        open={!!selectedConversion}
        onOpenChange={(open) => {
          if (!open) setSelectedConversion(null)
        }}
        title={selectedConversion ? `Conversion #${selectedConversion.id}` : "Conversion details"}
        description="Quick review of the selected conversion."
        footer={
          selectedConversion ? (
            <Button asChild>
              <Link href={`/admin/conversions/${selectedConversion.id}`}>Open full detail page</Link>
            </Button>
          ) : undefined
        }
      >
        {selectedConversion ? (
          <>
            <DetailRow label="Affiliate">{selectedConversion.affiliateName}</DetailRow>
            <DetailRow label="Affiliate Email">{selectedConversion.affiliateEmail || "Unavailable"}</DetailRow>
            <DetailRow label="Site">{selectedConversion.siteName}</DetailRow>
            <DetailRow label="Customer">{getConversionCustomerEmail(selectedConversion)}</DetailRow>
            <DetailRow label="Date">{formatDateTime(selectedConversion.conversionDate)}</DetailRow>
            <DetailRow label="Purchase">
              {formatCurrency(selectedConversion.purchaseAmount, selectedConversion.currency ?? undefined)}
            </DetailRow>
            <DetailRow label="Commission">
              {formatCurrency(selectedConversion.commissionAmount, selectedConversion.currency ?? undefined)}
            </DetailRow>
            <DetailRow label="Commission Rate">{formatPercent(selectedConversion.commissionPercentage)}</DetailRow>
            <DetailRow label="Type">{selectedConversion.conversionType || "Unknown"}</DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={selectedConversion.status} />
            </DetailRow>
            <DetailRow label="Created">{formatDateTime(selectedConversion.createdAt)}</DetailRow>
          </>
        ) : null}
      </DetailSheet>
    </div>
  )
}
