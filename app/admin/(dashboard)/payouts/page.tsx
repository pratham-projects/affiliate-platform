"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Clock, DollarSign, UserRound, Wallet } from "lucide-react"
import {
  AsyncBoundary,
  DataTable,
  DataTablePagination,
  FilterBar,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { SearchDropdown, type SearchDropdownOption } from "@/components/ui/search-dropdown"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { affiliatesService, payoutsService, type PayoutRequest } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { isAdmin, useAuth } from "@/lib/auth-context"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { useNotification } from "@/components/ui/notification"
import { mapAffiliateToOption } from "@/lib/utils/search-mapping"
import { buildAdminPayoutParams, buildPayoutSummary } from "./payouts-view-model"

const INITIAL_FILTERS = {
  tab: "pending",
  status: "all",
  affiliate: "all",
  page: 1,
  pageSize: 20,
}

export default function AdminPayoutsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { error: notifyError } = useNotification()
  const router = useRouter()
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")

  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [affiliateOptions, setAffiliateOptions] = useState<SearchDropdownOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchPayouts = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await payoutsService.getPayouts(buildAdminPayoutParams(filters))
        setPayouts(response.data)
        setTotal(response.pagination?.total ?? response.data.length)
      } catch (loadError) {
        const parsed = parseApiError(loadError)
        setError(parsed.message)
        notifyError(parsed.message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [filters, notifyError],
  )

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
    if (authLoading || !isAdmin(user?.role)) return

    const fetchKey = JSON.stringify(buildAdminPayoutParams(filters))
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchPayouts()
  }, [authLoading, fetchPayouts, filters, user?.role])

  const handleAffiliateSearch = async (query: string) => {
    try {
      const results = await affiliatesService.search({ q: query, status: "approved" })
      setAffiliateOptions(results.map(mapAffiliateToOption))
    } catch {
      setAffiliateOptions([])
    }
  }

  const summary = useMemo(() => buildPayoutSummary(payouts), [payouts])

  const columns: Column<PayoutRequest>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (payout) => (
          <div className="space-y-1">
            <p className="font-medium">{payout.affiliateName}</p>
            <p className="text-sm text-muted-foreground">{payout.affiliateEmail}</p>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        cell: (payout) => (
          <div className="space-y-1">
            <p className="font-medium">
              {formatCurrency(payout.approvedAmount || payout.requestedAmount, payout.currency)}
            </p>
            {payout.approvedAmount && payout.approvedAmount !== payout.requestedAmount ? (
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrency(payout.requestedAmount, payout.currency)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: "requestedOn",
        header: "Requested",
        cell: (payout) => <span className="text-sm text-muted-foreground">{formatDateTime(payout.createdAt)}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (payout) => <StatusBadge status={payout.status} />,
      },
      {
        key: "items",
        header: "Included Items",
        cell: (payout) => (
          <span className="text-sm text-muted-foreground">
            {payout.includedConversionIds?.length ?? 0}
          </span>
        ),
      },
    ],
    [],
  )

  if (authLoading || !isAdmin(user?.role)) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description="Review affiliate payout requests and drill into settlement details."
        onRefresh={() => void fetchPayouts(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible Requests" value={summary.total} icon={Archive} loading={isLoading && payouts.length === 0} />
        <StatCard label="Pending" value={summary.pending} icon={Clock} loading={isLoading && payouts.length === 0} />
        <StatCard label="Approved" value={summary.approved} icon={Wallet} loading={isLoading && payouts.length === 0} />
        <StatCard
          label="Requested Value"
          value={formatCurrency(summary.requestedAmount)}
          icon={DollarSign}
          loading={isLoading && payouts.length === 0}
        />
      </div>

      <Tabs value={filters.tab} onValueChange={(value) => setFilters({ tab: value, page: 1 })} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">All Payouts</TabsTrigger>
        </TabsList>

        <FilterBar className="rounded-lg border bg-card p-4">
          <SearchDropdown
            value={filters.affiliate}
            onChange={(value) => setFilter("affiliate", value || "all")}
            onSearch={handleAffiliateSearch}
            options={affiliateOptions}
            placeholder="Filter by affiliate"
            allowClear
            className="w-full sm:w-[260px]"
          />
          <Tabs value={filters.status} onValueChange={(value) => setFilter("status", value)}>
            <TabsList>
              <TabsTrigger value="all" disabled={filters.tab === "pending"}>
                All statuses
              </TabsTrigger>
              <TabsTrigger value="approved" disabled={filters.tab === "pending"}>
                Approved
              </TabsTrigger>
              <TabsTrigger value="completed" disabled={filters.tab === "pending"}>
                Completed
              </TabsTrigger>
              <TabsTrigger value="rejected" disabled={filters.tab === "pending"}>
                Rejected
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </FilterBar>

        <AsyncBoundary
          loading={isLoading && payouts.length === 0}
          error={error}
          isEmpty={!isLoading && payouts.length === 0}
          loadingFallback={<TableSkeleton rows={8} columns={5} />}
          onRetry={() => void fetchPayouts()}
          emptyTitle="No payout requests"
          emptyDescription="No payout requests match the current tab and filters."
        >
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={payouts}
              rowKey={(payout) => payout.id}
              onRowClick={(payout) => router.push(`/admin/payouts/${payout.id}`)}
              emptyTitle="No payout requests"
              emptyDescription="No payout requests match the current tab and filters."
            />
            <DataTablePagination
              page={filters.page}
              pageSize={filters.pageSize}
              total={total}
              onPageChange={(page) => setFilter("page", page)}
            />
          </div>
        </AsyncBoundary>
      </Tabs>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <UserRound className="size-4" />
          Filters are scoped to the current tab. Pending always requests pending payouts from the API.
        </div>
      </div>
    </div>
  )
}
