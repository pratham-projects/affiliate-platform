"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Eye } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import {
  conversionTypesService,
  conversionsService,
  type Conversion,
  type ConversionType,
} from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"

const INITIAL_FILTERS = {
  status: "all",
  conversionType: "all",
  startDate: "",
  endDate: "",
  search: "",
  page: 1,
  pageSize: 20,
}

export default function ConversionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedConversion, setSelectedConversion] = useState<Conversion | null>(null)
  const [conversionTypes, setConversionTypes] = useState<ConversionType[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const lastFetchKeyRef = useRef("")
  const typeFetchRef = useRef(false)
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)

  const fetchConversions = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await conversionsService.getMyConversions({
          page: filters.page,
          limit: filters.pageSize,
          status: filters.status,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          conversionType: filters.conversionType,
          search: filters.search || undefined,
        })

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
    if (typeFetchRef.current) return
    typeFetchRef.current = true

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
    if (authLoading || !isAffiliate(user?.role)) return

    const fetchKey = JSON.stringify(filters)
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchConversions()
  }, [authLoading, fetchConversions, filters, user?.role])

  const filteredConversions = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    if (!query) return conversions

    return conversions.filter((conversion) => {
      const haystacks = [
        conversion.siteName,
        conversion.customerEmail,
        conversion.referralCode,
        conversion.conversionType,
      ]

      return haystacks.some((value) => value?.toLowerCase().includes(query))
    })
  }, [conversions, filters.search])

  if (authLoading) {
    return <ConversionsTableSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  const columns: Column<Conversion>[] = [
    {
      key: "site",
      header: "Site",
      cell: (conversion) => (
        <div className="space-y-1">
          <div className="font-medium">{conversion.siteName}</div>
          <div className="text-xs text-muted-foreground">
            {conversion.customerEmail || "Customer email unavailable"}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (conversion) => (
        <div className="space-y-1">
          <div>{formatDate(conversion.conversionDate)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(conversion.conversionDate)}
          </div>
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
      key: "open",
      header: "",
      className: "w-[72px]",
      cell: (conversion) => (
        <Button
          variant="ghost"
          size="icon"
          asChild
          onClick={(event) => event.stopPropagation()}
        >
          <Link href={`/conversions/${conversion.id}`}>
            <Eye className="size-4" />
            <span className="sr-only">Open conversion</span>
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Conversions"
          description="Review your recorded conversions, commission values, and status updates."
          onRefresh={() => fetchConversions(true)}
          isRefreshing={isRefreshing}
        />

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Conversion History</CardTitle>
            </div>
            <FilterBar
              search={filters.search}
              onSearchChange={(value) => setFilter("search", value)}
              searchPlaceholder="Search site, email, code, or type..."
            >
              <Select value={filters.status} onValueChange={(value) => setFilter("status", value)}>
                <SelectTrigger className="w-full sm:w-[160px]">
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
                onValueChange={(value) => setFilter("conversionType", value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Conversion type" />
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

                  const startDate = range?.from ? format(range.from, "yyyy-MM-dd") : ""
                  const endDate = range?.from
                    ? format(range.to ?? range.from, "yyyy-MM-dd")
                    : ""

                  setFilters({
                    startDate,
                    endDate,
                    page: 1,
                  })
                }}
                placeholder="Date range"
                className="w-full sm:w-[260px]"
              />

              {dateRange?.from && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateRange(undefined)
                    setFilters({ startDate: "", endDate: "", page: 1 })
                  }}
                >
                  Clear dates
                </Button>
              )}
            </FilterBar>
          </CardHeader>
          <CardContent className="space-y-4">
            <AsyncBoundary
              loading={isLoading}
              error={error}
              isEmpty={filteredConversions.length === 0}
              loadingFallback={<TableSkeleton rows={8} columns={7} />}
              onRetry={() => fetchConversions()}
              emptyTitle="No conversions found"
              emptyDescription="Try a different filter or wait for new conversions to arrive."
            >
              <DataTable
                columns={columns}
                data={filteredConversions}
                rowKey={(conversion) => conversion.id}
                onRowClick={(conversion) => setSelectedConversion(conversion)}
                emptyTitle="No conversions found"
                emptyDescription="Try a different filter or wait for new conversions to arrive."
                className="border-0"
              />
              <DataTablePagination
                page={filters.page}
                pageSize={filters.pageSize}
                total={total}
                onPageChange={(page) => setFilter("page", page)}
                className="pt-2"
              />
            </AsyncBoundary>
          </CardContent>
        </Card>
      </div>

      <DetailSheet
        open={Boolean(selectedConversion)}
        onOpenChange={(open) => !open && setSelectedConversion(null)}
        title={selectedConversion ? `Conversion #${selectedConversion.id}` : "Conversion Details"}
        description="Quick detail preview for the selected conversion."
        footer={
          selectedConversion ? (
            <Button asChild>
              <Link href={`/conversions/${selectedConversion.id}`}>Open full details</Link>
            </Button>
          ) : null
        }
      >
        {selectedConversion && (
          <div>
            <DetailRow label="Site">{selectedConversion.siteName}</DetailRow>
            <DetailRow label="Customer">
              {selectedConversion.customerEmail || "Customer email unavailable"}
            </DetailRow>
            <DetailRow label="Date">
              {formatDateTime(selectedConversion.conversionDate)}
            </DetailRow>
            <DetailRow label="Purchase">
              {formatCurrency(selectedConversion.purchaseAmount, selectedConversion.currency ?? undefined)}
            </DetailRow>
            <DetailRow label="Commission">
              {formatCurrency(selectedConversion.commissionAmount, selectedConversion.currency ?? undefined)}
            </DetailRow>
            <DetailRow label="Rate">
              {formatPercent(selectedConversion.commissionPercentage)}
            </DetailRow>
            <DetailRow label="Type">
              {selectedConversion.conversionType || "Unknown"}
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={selectedConversion.status} />
            </DetailRow>
            <DetailRow label="Referral Code">
              {selectedConversion.referralCode || "No referral code"}
            </DetailRow>
          </div>
        )}
      </DetailSheet>
    </>
  )
}

function ConversionsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Conversion History</CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={8} columns={7} />
      </CardContent>
    </Card>
  )
}
