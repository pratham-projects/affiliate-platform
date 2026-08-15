"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type DateRange } from "react-day-picker"
import { Globe, Laptop, MousePointerClick, RefreshCw, Smartphone, UserRound } from "lucide-react"
import {
  AnalyticsInsightsPanel,
  AsyncBoundary,
  CopyButton,
  DataTable,
  DataTablePagination,
  FilterBar,
  PageHeader,
  StatCard,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { SearchDropdown, type SearchDropdownOption } from "@/components/ui/search-dropdown"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  affiliatesService,
  analyticsService,
  type AffiliateAnalyticsRow,
  type AnalyticsPaginationMeta,
  type BrowserAnalyticsRow,
  type CountryAnalyticsRow,
  type DeviceAnalyticsRow,
  type OSAnalyticsRow,
  type ReferrerAnalyticsRow,
} from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { isAdmin, useAuth } from "@/lib/auth-context"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { mapAffiliateToOption } from "@/lib/utils/search-mapping"
import { buildAnalyticsParams, countActiveAnalyticsFilters } from "./analytics-view-model"

type TabValue = "affiliates" | "referrers" | "os" | "browsers" | "countries" | "devices"
type TableRow =
  | AffiliateAnalyticsRow
  | ReferrerAnalyticsRow
  | OSAnalyticsRow
  | BrowserAnalyticsRow
  | CountryAnalyticsRow
  | DeviceAnalyticsRow

const INITIAL_FILTERS = {
  affiliate: "all",
  referrer: "",
  os: "",
  browser: "",
  country: "",
  device: "",
  status: "all",
  startDate: "",
  endDate: "",
  page: 1,
  pageSize: 20,
}

const EMPTY_PAGINATION: AnalyticsPaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")

  const [activeTab, setActiveTab] = useState<TabValue>("affiliates")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [affiliateOptions, setAffiliateOptions] = useState<SearchDropdownOption[]>([])
  const [rows, setRows] = useState<Record<TabValue, TableRow[]>>({
    affiliates: [],
    referrers: [],
    os: [],
    browsers: [],
    countries: [],
    devices: [],
  })
  const [pagination, setPagination] = useState(EMPTY_PAGINATION)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const params = buildAnalyticsParams(filters)
        const response =
          activeTab === "affiliates"
            ? await analyticsService.getAffiliateAnalytics(params)
            : activeTab === "referrers"
              ? await analyticsService.getReferrerAnalyticsPaginated(params)
              : activeTab === "os"
                ? await analyticsService.getOSAnalytics(params)
                : activeTab === "browsers"
                  ? await analyticsService.getBrowserAnalyticsPaginated(params)
                  : activeTab === "countries"
                    ? await analyticsService.getCountryAnalytics(params)
                    : await analyticsService.getDeviceAnalytics(params)

        setRows((current) => ({ ...current, [activeTab]: response.data }))
        setPagination(response.pagination)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeTab, filters],
  )

  useEffect(() => {
    if (authLoading || !isAdmin(user?.role)) return

    const fetchKey = JSON.stringify({ activeTab, params: buildAnalyticsParams(filters) })
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchAnalytics()
  }, [activeTab, authLoading, fetchAnalytics, filters, user?.role])

  const handleAffiliateSearch = async (query: string) => {
    try {
      const results = await affiliatesService.search({ q: query, status: "approved" })
      setAffiliateOptions(results.map(mapAffiliateToOption))
    } catch {
      setAffiliateOptions([])
    }
  }

  const activeRows = rows[activeTab]
  const activeFilterCount = countActiveAnalyticsFilters(filters)
  const summary = useMemo(() => {
    const totals = activeRows.reduce(
      (acc, row) => {
        acc.clicks += Number((row as any).totalClicks || 0)
        acc.customers += Number((row as any).totalCustomers || 0)
        acc.conversions += Number((row as any).totalConversions || 0)
        acc.revenue += Number((row as any).totalConversionAmount || 0)
        acc.commission += Number((row as any).totalCommission || 0)
        return acc
      },
      { clicks: 0, customers: 0, conversions: 0, revenue: 0, commission: 0 },
    )

    return totals
  }, [activeRows])

  const columns: Record<TabValue, Column<TableRow>[]> = useMemo(
    () => ({
      affiliates: [
        { key: "affiliateName", header: "Affiliate", cell: (row) => (row as AffiliateAnalyticsRow).affiliateName },
        { key: "affiliateEmail", header: "Email", cell: (row) => (row as AffiliateAnalyticsRow).affiliateEmail },
        { key: "totalClicks", header: "Clicks", cell: (row) => formatNumber((row as any).totalClicks) },
        { key: "totalCustomers", header: "Customers", cell: (row) => formatNumber((row as any).totalCustomers) },
        { key: "totalConversions", header: "Conversions", cell: (row) => formatNumber((row as any).totalConversions) },
        { key: "totalConversionAmount", header: "Revenue", cell: (row) => formatCurrency((row as any).totalConversionAmount) },
        { key: "totalCommission", header: "Commission", cell: (row) => formatCurrency((row as any).totalCommission) },
      ],
      referrers: [
        {
          key: "referrer",
          header: "Referrer",
          cell: (row) => {
            const referrer = (row as ReferrerAnalyticsRow).referrer || "Direct / none"
            return (
              <div className="flex items-center gap-2">
                <span className="truncate">{referrer}</span>
                {(row as ReferrerAnalyticsRow).referrer ? <CopyButton value={referrer} /> : null}
              </div>
            )
          },
        },
        { key: "totalClicks", header: "Clicks", cell: (row) => formatNumber((row as any).totalClicks) },
        { key: "totalCustomers", header: "Customers", cell: (row) => formatNumber((row as any).totalCustomers) },
        { key: "totalConversions", header: "Conversions", cell: (row) => formatNumber((row as any).totalConversions) },
        { key: "totalConversionAmount", header: "Revenue", cell: (row) => formatCurrency((row as any).totalConversionAmount) },
        { key: "totalCommission", header: "Commission", cell: (row) => formatCurrency((row as any).totalCommission) },
      ],
      os: [
        { key: "os", header: "Operating system", cell: (row) => (row as OSAnalyticsRow).os },
        { key: "totalClicks", header: "Clicks", cell: (row) => formatNumber((row as any).totalClicks) },
        { key: "totalCustomers", header: "Customers", cell: (row) => formatNumber((row as any).totalCustomers) },
        { key: "totalConversions", header: "Conversions", cell: (row) => formatNumber((row as any).totalConversions) },
        { key: "totalConversionAmount", header: "Revenue", cell: (row) => formatCurrency((row as any).totalConversionAmount) },
        { key: "totalCommission", header: "Commission", cell: (row) => formatCurrency((row as any).totalCommission) },
      ],
      browsers: [
        { key: "browser", header: "Browser", cell: (row) => (row as BrowserAnalyticsRow).browser },
        { key: "totalClicks", header: "Clicks", cell: (row) => formatNumber((row as any).totalClicks) },
        { key: "totalCustomers", header: "Customers", cell: (row) => formatNumber((row as any).totalCustomers) },
        { key: "totalConversions", header: "Conversions", cell: (row) => formatNumber((row as any).totalConversions) },
        { key: "totalConversionAmount", header: "Revenue", cell: (row) => formatCurrency((row as any).totalConversionAmount) },
        { key: "totalCommission", header: "Commission", cell: (row) => formatCurrency((row as any).totalCommission) },
      ],
      countries: [
        { key: "country", header: "Country", cell: (row) => (row as CountryAnalyticsRow).country },
        { key: "totalClicks", header: "Clicks", cell: (row) => formatNumber((row as any).totalClicks) },
        { key: "totalCustomers", header: "Customers", cell: (row) => formatNumber((row as any).totalCustomers) },
        { key: "totalConversions", header: "Conversions", cell: (row) => formatNumber((row as any).totalConversions) },
        { key: "totalConversionAmount", header: "Revenue", cell: (row) => formatCurrency((row as any).totalConversionAmount) },
        { key: "totalCommission", header: "Commission", cell: (row) => formatCurrency((row as any).totalCommission) },
      ],
      devices: [
        { key: "deviceType", header: "Device", cell: (row) => (row as DeviceAnalyticsRow).deviceType },
        { key: "totalClicks", header: "Clicks", cell: (row) => formatNumber((row as any).totalClicks) },
        { key: "totalCustomers", header: "Customers", cell: (row) => formatNumber((row as any).totalCustomers) },
        { key: "totalConversions", header: "Conversions", cell: (row) => formatNumber((row as any).totalConversions) },
        { key: "totalConversionAmount", header: "Revenue", cell: (row) => formatCurrency((row as any).totalConversionAmount) },
        { key: "totalCommission", header: "Commission", cell: (row) => formatCurrency((row as any).totalCommission) },
      ],
    }),
    [],
  )

  if (authLoading || !isAdmin(user?.role)) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Explore aggregated performance by affiliate, referrer, geography, device, and browser."
        onRefresh={() => void fetchAnalytics(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rows" value={pagination.total} icon={UserRound} loading={isLoading && activeRows.length === 0} />
        <StatCard label="Clicks" value={formatNumber(summary.clicks)} icon={MousePointerClick} loading={isLoading && activeRows.length === 0} />
        <StatCard label="Conversions" value={formatNumber(summary.conversions)} icon={Globe} loading={isLoading && activeRows.length === 0} />
        <StatCard label="Revenue" value={formatCurrency(summary.revenue)} icon={Laptop} loading={isLoading && activeRows.length === 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["affiliates", "Affiliates"],
          ["referrers", "Referrers"],
          ["os", "Operating systems"],
          ["browsers", "Browsers"],
          ["countries", "Countries"],
          ["devices", "Devices"],
        ] as Array<[TabValue, string]>).map(([value, label]) => (
          <Button
            key={value}
            variant={activeTab === value ? "default" : "outline"}
            onClick={() => {
              setActiveTab(value)
              setFilter("page", 1)
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <FilterBar className="rounded-lg border bg-card p-4">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range)
            setFilters({
              startDate: range?.from ? range.from.toISOString().slice(0, 10) : "",
              endDate: range?.to ? range.to.toISOString().slice(0, 10) : range?.from ? range.from.toISOString().slice(0, 10) : "",
              page: 1,
            })
          }}
          className="w-full sm:w-[280px]"
        />
        <SearchDropdown
          value={filters.affiliate}
          onChange={(value) => setFilter("affiliate", value || "all")}
          onSearch={handleAffiliateSearch}
          options={affiliateOptions}
          placeholder="Affiliate"
          allowClear
          className="w-full sm:w-[220px]"
        />
        <Input placeholder="Referrer" value={filters.referrer} onChange={(event) => setFilter("referrer", event.target.value)} className="sm:w-[180px]" />
        <Input placeholder="OS" value={filters.os} onChange={(event) => setFilter("os", event.target.value)} className="sm:w-[160px]" />
        <Input placeholder="Browser" value={filters.browser} onChange={(event) => setFilter("browser", event.target.value)} className="sm:w-[160px]" />
        <Input placeholder="Country" value={filters.country} onChange={(event) => setFilter("country", event.target.value)} className="sm:w-[160px]" />
        <Input placeholder="Device" value={filters.device} onChange={(event) => setFilter("device", event.target.value)} className="sm:w-[160px]" />
        <Select value={filters.status} onValueChange={(value) => setFilter("status", value)}>
          <SelectTrigger className="sm:w-[180px]">
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
        {activeFilterCount > 0 ? (
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                affiliate: "all",
                referrer: "",
                os: "",
                browser: "",
                country: "",
                device: "",
                status: "all",
                startDate: "",
                endDate: "",
                page: 1,
              })
            }
          >
            <RefreshCw className="size-4" />
            Clear filters
          </Button>
        ) : null}
      </FilterBar>

      <AsyncBoundary
        loading={isLoading && activeRows.length === 0}
        error={error}
        isEmpty={!isLoading && activeRows.length === 0}
        loadingFallback={<TableSkeleton rows={8} columns={6} />}
        onRetry={() => void fetchAnalytics()}
        emptyTitle="No analytics rows"
        emptyDescription="No analytics data matches the current tab and filters."
      >
        <div className="space-y-4">
          <DataTable
            columns={columns[activeTab]}
            data={activeRows}
            rowKey={(row) => {
              const record = row as any
              return record.affiliateId || record.referrer || record.os || record.browser || record.country || record.deviceType || "row"
            }}
            emptyTitle="No analytics rows"
            emptyDescription="No analytics data matches the current tab and filters."
          />
          <DataTablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={(page) => setFilter("page", page)}
          />
        </div>
      </AsyncBoundary>

      <AnalyticsInsightsPanel
        rows={activeRows}
        countryRows={activeTab === "countries" ? (activeRows as CountryAnalyticsRow[]) : undefined}
        title="Analytics Insights"
      />

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Active filters: {activeFilterCount}. Insights use the rows returned for the selected tab and filters.
      </div>
    </div>
  )
}
