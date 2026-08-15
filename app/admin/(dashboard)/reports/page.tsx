"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type DateRange } from "react-day-picker"
import { BarChart3, DollarSign, RefreshCw, Users, Wallet } from "lucide-react"
import {
  AsyncBoundary,
  DataTable,
  DataTablePagination,
  DetailSheet,
  FilterBar,
  PageHeader,
  StatCard,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-picker"
import { reportsService, type AffiliatePerformance } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { isSuperAdmin, useAuth } from "@/lib/auth-context"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { buildOverviewSummary, buildTopAffiliateQuery, buildTopAffiliateRow } from "./reports-view-model"

const INITIAL_FILTERS = {
  startDate: "",
  endDate: "",
  page: 1,
  pageSize: 20,
}

type TopAffiliateRow = ReturnType<typeof buildTopAffiliateRow>

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")

  const [overview, setOverview] = useState<ReturnType<typeof buildOverviewSummary> | null>(null)
  const [browserAnalytics, setBrowserAnalytics] = useState<Array<{ browser: string; percentage: string; conversions: number }>>([])
  const [osAnalytics, setOsAnalytics] = useState<Array<{ os: string; percentage: string; conversions: number }>>([])
  const [deviceAnalytics, setDeviceAnalytics] = useState<Array<{ deviceType: string; percentage: string; conversions: number }>>([])
  const [rows, setRows] = useState<TopAffiliateRow[]>([])
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliatePerformance | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

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

  const fetchReports = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const summary = await reportsService.getAdminSummary(buildTopAffiliateQuery(filters))

        setOverview(buildOverviewSummary(summary.overview))
        setBrowserAnalytics(summary.browsers)
        setOsAnalytics(summary.os)
        setDeviceAnalytics(summary.devices)
        setRows(summary.topAffiliates.map(buildTopAffiliateRow))
        setTotal(summary.totals.affiliates)
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
    if (authLoading || !isSuperAdmin(user?.role)) return

    const fetchKey = JSON.stringify(buildTopAffiliateQuery(filters))
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchReports()
  }, [authLoading, fetchReports, filters, user?.role])

  const handleAffiliateSelect = async (row: TopAffiliateRow) => {
    setIsDetailLoading(true)
    try {
      const performance = await reportsService.getAffiliatePerformance(row.affiliateId, {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      })
      setSelectedAffiliate(performance)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const columns: Column<TopAffiliateRow>[] = useMemo(
    () => [
      { key: "affiliateName", header: "Affiliate", cell: (row) => row.affiliateName },
      { key: "conversions", header: "Conversions", cell: (row) => formatNumber(row.conversions) },
      { key: "revenue", header: "Revenue", cell: (row) => formatCurrency(row.revenue) },
      { key: "commission", header: "Commission", cell: (row) => formatCurrency(row.commission) },
    ],
    [],
  )

  const summary = overview ?? buildOverviewSummary(null)

  if (authLoading || !isSuperAdmin(user?.role)) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="High-level business reporting and top affiliate performance."
        onRefresh={() => void fetchReports(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={formatNumber(summary.customers)} icon={Users} loading={isLoading && !overview} />
        <StatCard label="Conversions" value={formatNumber(summary.conversions)} icon={BarChart3} loading={isLoading && !overview} />
        <StatCard label="Revenue" value={formatCurrency(summary.revenue)} icon={DollarSign} loading={isLoading && !overview} />
        <StatCard label="Commission" value={formatCurrency(summary.commission)} icon={Wallet} loading={isLoading && !overview} />
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
          className="w-full sm:w-[320px]"
        />
        {dateRange?.from ? (
          <Button variant="outline" onClick={() => setFilters({ startDate: "", endDate: "", page: 1 })}>
            <RefreshCw className="size-4" />
            Clear dates
          </Button>
        ) : null}
      </FilterBar>

      <div className="grid gap-4 lg:grid-cols-3">
        <SmallAnalyticsCard title="Browsers" rows={browserAnalytics.map((item) => ({
          label: item.browser,
          value: `${item.percentage}%`,
          hint: `${formatNumber(item.conversions)} conversions`,
        }))} />
        <SmallAnalyticsCard title="Operating systems" rows={osAnalytics.map((item) => ({
          label: item.os,
          value: `${item.percentage}%`,
          hint: `${formatNumber(item.conversions)} conversions`,
        }))} />
        <SmallAnalyticsCard title="Devices" rows={deviceAnalytics.map((item) => ({
          label: item.deviceType,
          value: `${item.percentage}%`,
          hint: `${formatNumber(item.conversions)} conversions`,
        }))} />
      </div>

      <AsyncBoundary
        loading={isLoading && rows.length === 0}
        error={error}
        isEmpty={!isLoading && rows.length === 0}
        loadingFallback={<TableSkeleton rows={8} columns={4} />}
        onRetry={() => void fetchReports()}
        emptyTitle="No affiliate data"
        emptyDescription="No affiliate reporting data is available for the selected range."
      >
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => void handleAffiliateSelect(row)}
            emptyTitle="No affiliate data"
            emptyDescription="No affiliate reporting data is available for the selected range."
          />
          <DataTablePagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            onPageChange={(page) => setFilter("page", page)}
          />
        </div>
      </AsyncBoundary>

      <DetailSheet
        open={Boolean(selectedAffiliate) || isDetailLoading}
        onOpenChange={(open) => {
          if (!open) setSelectedAffiliate(null)
        }}
        title={selectedAffiliate?.affiliateName || "Affiliate performance"}
        description={selectedAffiliate?.email}
      >
        {isDetailLoading ? (
          <TableSkeleton rows={4} columns={2} />
        ) : selectedAffiliate ? (
          <div className="space-y-3">
            <ReportDetail label="Conversions" value={formatNumber(selectedAffiliate.totalConversions)} />
            <ReportDetail label="Revenue" value={formatCurrency(selectedAffiliate.totalRevenue)} />
            <ReportDetail label="Commission" value={formatCurrency(selectedAffiliate.totalCommission)} />
            <ReportDetail label="Conversion rate" value={`${selectedAffiliate.conversionRate?.toFixed(1) || 0}%`} />
            <ReportDetail label="Referral code" value={selectedAffiliate.referralCode || "—"} />
          </div>
        ) : null}
      </DetailSheet>
    </div>
  )
}

function SmallAnalyticsCard({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: string; hint: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          rows.slice(0, 5).map((row) => (
            <div key={`${title}-${row.label}`} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.label}</p>
                <p className="text-sm text-muted-foreground">{row.hint}</p>
              </div>
              <span className="shrink-0 font-medium">{row.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ReportDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
