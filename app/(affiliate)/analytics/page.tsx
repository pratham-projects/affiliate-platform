"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  ArrowLeftRight,
  BarChart3,
  Globe,
  Laptop,
  Map,
  MonitorSmartphone,
  MousePointerClick,
  Users,
  Wallet,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  AnalyticsInsightsPanel,
  AsyncBoundary,
  DataTable,
  DataTablePagination,
  FilterBar,
  PageHeader,
  StatCard,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DateRangePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import {
  affiliatesService,
  analyticsService,
  type AnalyticsPaginationMeta,
  type BrowserAnalyticsRow,
  type CountryAnalyticsRow,
  type DeviceAnalyticsRow,
  type OSAnalyticsRow,
  type ReferrerAnalyticsRow,
} from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatNumber } from "@/lib/utils"
import {
  buildSelfAnalyticsParams,
  summarizeAnalyticsRows,
  truncateReferrer,
  type AnalyticsTab,
} from "./analytics-utils"

type AnalyticsRow =
  | ReferrerAnalyticsRow
  | OSAnalyticsRow
  | BrowserAnalyticsRow
  | CountryAnalyticsRow
  | DeviceAnalyticsRow

const EMPTY_PAGINATION: AnalyticsPaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

const SEARCH_PLACEHOLDERS: Record<AnalyticsTab, string> = {
  referrers: "Search referrers...",
  os: "Search operating systems...",
  browsers: "Search browsers...",
  countries: "Search countries...",
  devices: "Search devices...",
}

const TAB_META: Record<AnalyticsTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  referrers: { label: "Referrers", icon: ArrowLeftRight },
  os: { label: "Operating Systems", icon: Laptop },
  browsers: { label: "Browsers", icon: Globe },
  countries: { label: "Countries", icon: Map },
  devices: { label: "Devices", icon: MonitorSmartphone },
}

const chartConfig = {
  conversions: {
    label: "Conversions",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export default function AffiliateAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [affiliateId, setAffiliateId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("referrers")
  const [rows, setRows] = useState<AnalyticsRow[]>([])
  const [pagination, setPagination] = useState<AnalyticsPaginationMeta>(EMPTY_PAGINATION)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const lastFetchKeyRef = useRef("")
  const affiliateFetchRef = useRef(false)

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (!affiliateId) return

      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const params = buildSelfAnalyticsParams({
          affiliateId,
          tab: activeTab,
          page: pagination.page,
          pageSize: pagination.pageSize,
          query,
          status,
          dateRange,
        })

        const response =
          activeTab === "referrers"
            ? await analyticsService.getMyReferrerAnalytics(params)
            : activeTab === "os"
              ? await analyticsService.getMyOSAnalytics(params)
              : activeTab === "browsers"
                ? await analyticsService.getMyBrowserAnalytics(params)
                : activeTab === "countries"
                  ? await analyticsService.getMyCountryAnalytics(params)
                  : await analyticsService.getMyDeviceAnalytics(params)

        setRows(response.data)
        setPagination(response.pagination || EMPTY_PAGINATION)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeTab, affiliateId, dateRange, pagination.page, pagination.pageSize, query, status],
  )

  useEffect(() => {
    if (affiliateFetchRef.current || authLoading || !isAffiliate(user?.role)) return
    affiliateFetchRef.current = true

    affiliatesService
      .getMe()
      .then((affiliate) => setAffiliateId(affiliate?.id ?? null))
      .catch(() => setError("Failed to resolve your affiliate profile."))
  }, [authLoading, user?.role])

  useEffect(() => {
    if (!affiliateId) return

    const fetchKey = JSON.stringify({
      affiliateId,
      activeTab,
      page: pagination.page,
      pageSize: pagination.pageSize,
      query,
      status,
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
    })

    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchAnalytics()
  }, [activeTab, affiliateId, dateRange, fetchAnalytics, pagination.page, pagination.pageSize, query, status])

  const summary = useMemo(() => summarizeAnalyticsRows(rows), [rows])

  const chartData = useMemo(() => {
    return rows.slice(0, 6).map((row) => ({
      label: getRowLabel(activeTab, row),
      conversions: row.totalConversions,
    }))
  }, [activeTab, rows])

  const columns: Column<AnalyticsRow>[] = useMemo(() => {
    const labelHeader = TAB_META[activeTab].label

    return [
      {
        key: "label",
        header: labelHeader,
        cell: (row) => renderLabelCell(activeTab, row),
      },
      {
        key: "clicks",
        header: "Clicks",
        cell: (row) => formatNumber(row.totalClicks),
      },
      {
        key: "customers",
        header: "Customers",
        cell: (row) => formatNumber(row.totalCustomers),
      },
      {
        key: "conversions",
        header: "Conversions",
        cell: (row) => formatNumber(row.totalConversions),
      },
      {
        key: "revenue",
        header: "Revenue",
        cell: (row) => formatCurrency(row.totalConversionAmount),
      },
      {
        key: "commission",
        header: "Commission",
        cell: (row) => formatCurrency(row.totalCommission),
      },
    ]
  }, [activeTab])

  if (authLoading) {
    return <AnalyticsPageSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Explore your referrers, devices, browsers, and country-level conversion performance."
        onRefresh={() => fetchAnalytics(true)}
        isRefreshing={isRefreshing}
      />

      <AsyncBoundary
        loading={isLoading && !affiliateId}
        error={error}
        isEmpty={!affiliateId}
        loadingFallback={<AnalyticsPageSkeleton />}
        onRetry={() => fetchAnalytics()}
        emptyTitle="Analytics unavailable"
        emptyDescription="Your affiliate profile could not be loaded yet."
      >
        <div className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as AnalyticsTab)
              setPagination((current) => ({ ...current, page: 1 }))
            }}
            className="space-y-4"
          >
            <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              {Object.entries(TAB_META).map(([value, meta]) => {
                const Icon = meta.icon
                return (
                  <TabsTrigger key={value} value={value} className="gap-2">
                    <Icon className="size-4" />
                    {meta.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clicks" value={formatNumber(summary.clicks)} icon={MousePointerClick} />
            <StatCard label="Customers" value={formatNumber(summary.customers)} icon={Users} />
            <StatCard label="Conversions" value={formatNumber(summary.conversions)} icon={BarChart3} />
            <StatCard label="Commission" value={formatCurrency(summary.commission)} icon={Wallet} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Analytics Breakdown</CardTitle>
                </div>
                <FilterBar
                  search={query}
                  onSearchChange={(value) => {
                    setQuery(value)
                    setPagination((current) => ({ ...current, page: 1 }))
                  }}
                  searchPlaceholder={SEARCH_PLACEHOLDERS[activeTab]}
                >
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value)
                      setPagination((current) => ({ ...current, page: 1 }))
                    }}
                  >
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

                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={(range) => {
                      setDateRange(range)
                      setPagination((current) => ({ ...current, page: 1 }))
                    }}
                    placeholder="Date range"
                    className="w-full sm:w-[260px]"
                  />

                  {dateRange?.from && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateRange(undefined)
                        setPagination((current) => ({ ...current, page: 1 }))
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
                  isEmpty={rows.length === 0}
                  loadingFallback={<TableSkeleton rows={8} columns={6} />}
                  onRetry={() => fetchAnalytics()}
                  emptyTitle="No analytics rows found"
                  emptyDescription="Try a different tab, query, or date range."
                >
                  <DataTable
                    columns={columns}
                    data={rows}
                    rowKey={(row) => getRowKey(activeTab, row)}
                    emptyTitle="No analytics rows found"
                    emptyDescription="Try a different tab, query, or date range."
                    className="border-0"
                  />
                  <DataTablePagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onPageChange={(page) =>
                      setPagination((current) => ({
                        ...current,
                        page,
                      }))
                    }
                    className="pt-2"
                  />
                </AsyncBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Top {TAB_META[activeTab].label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No chart data for the current filters.
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-22}
                        textAnchor="end"
                        height={72}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="conversions" fill="var(--color-conversions)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <AnalyticsInsightsPanel
            rows={rows}
            countryRows={activeTab === "countries" ? (rows as CountryAnalyticsRow[]) : undefined}
            title="Analytics Insights"
          />
        </div>
      </AsyncBoundary>
    </div>
  )
}

function getRowLabel(tab: AnalyticsTab, row: AnalyticsRow) {
  if (tab === "referrers") {
    return truncateReferrer((row as ReferrerAnalyticsRow).referrer).full
  }

  if (tab === "os") return (row as OSAnalyticsRow).os || "Unknown"
  if (tab === "browsers") return (row as BrowserAnalyticsRow).browser || "Unknown"
  if (tab === "countries") return (row as CountryAnalyticsRow).country || "Unknown"
  return (row as DeviceAnalyticsRow).deviceType || "Unknown"
}

function getRowKey(tab: AnalyticsTab, row: AnalyticsRow) {
  return `${tab}:${getRowLabel(tab, row)}`
}

function renderLabelCell(tab: AnalyticsTab, row: AnalyticsRow) {
  if (tab === "referrers") {
    const referrer = truncateReferrer((row as ReferrerAnalyticsRow).referrer)
    return (
      <div className="space-y-1">
        <div className="font-medium">{referrer.short}</div>
        {referrer.truncated && (
          <div className="text-xs text-muted-foreground">{referrer.full}</div>
        )}
      </div>
    )
  }

  return <span className="font-medium">{getRowLabel(tab, row)}</span>
}

function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TableSkeleton rows={1} columns={4} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Analytics Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} columns={6} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={6} columns={1} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
