"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Banknote, Clock3, Wallet } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNotification } from "@/components/ui/notification"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import { parseApiError } from "@/lib/api/errors"
import { payoutsService, type PayoutRequest, type SalesBreakdownItem } from "@/lib/api/payouts"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { buildAffiliatePayoutStats, getPayoutRequestEnabled } from "./payouts-view-model"

const PAGE_SIZE = 10

export default function PayoutsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { success, error: notifyError } = useNotification()
  const fetchedRef = useRef(false)

  const [balance, setBalance] = useState<Awaited<ReturnType<typeof payoutsService.getAvailableBalance>>>(null)
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyQuery, setHistoryQuery] = useState("")

  const fetchData = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [balanceData, historyData] = await Promise.all([
          payoutsService.getAvailableBalance(),
          payoutsService.getPayouts({ page, limit: PAGE_SIZE }),
        ])

        setBalance(balanceData)
        setPayouts(historyData.data)
        setTotal(historyData.pagination.total)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [page],
  )

  useEffect(() => {
    if (!authLoading && !isAffiliate(user?.role)) {
      router.push("/")
      return
    }

    if (authLoading || !user || fetchedRef.current) return
    fetchedRef.current = true
    void fetchData()
  }, [authLoading, user, router, fetchData])

  useEffect(() => {
    if (!fetchedRef.current) return
    void fetchData(true)
  }, [page, fetchData])

  const handleRequestPayout = useCallback(async () => {
    if (!getPayoutRequestEnabled(balance)) return

    setIsRequesting(true)
    try {
      await payoutsService.createRequest()
      success("Payout request submitted successfully")
      await fetchData(true)
    } catch (requestError) {
      notifyError(parseApiError(requestError).message)
    } finally {
      setIsRequesting(false)
    }
  }, [balance, fetchData, notifyError, success])

  const stats = useMemo(() => buildAffiliatePayoutStats(balance), [balance])

  const filteredPayouts = useMemo(() => {
    const query = historyQuery.trim().toLowerCase()
    if (!query) return payouts

    return payouts.filter((payout) => {
      return (
        payout.status.toLowerCase().includes(query) ||
        String(payout.id).includes(query) ||
        formatDate(payout.createdAt).toLowerCase().includes(query)
      )
    })
  }, [historyQuery, payouts])

  const payoutColumns: Column<PayoutRequest>[] = useMemo(
    () => [
      {
        key: "request",
        header: "Request",
        cell: (payout) => (
          <div className="space-y-1">
            <div className="font-medium">#{payout.id}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(payout.createdAt)}</div>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        cell: (payout) => (
          <div className="space-y-1">
            <div className="font-medium">
              {formatCurrency(payout.approvedAmount ?? payout.requestedAmount, payout.currency)}
            </div>
            {payout.approvedAmount && payout.approvedAmount !== payout.requestedAmount ? (
              <div className="text-xs text-muted-foreground line-through">
                {formatCurrency(payout.requestedAmount, payout.currency)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "batch",
        header: "Batch",
        cell: (payout) => {
          const included = payout.includedConversionIds?.length ?? 0
          const excluded = payout.excludedConversionIds?.length ?? 0

          return (
            <div className="space-y-1 text-sm">
              <div>{included > 0 ? `${included} included` : "No line items"}</div>
              {excluded > 0 ? <div className="text-xs text-muted-foreground">{excluded} excluded</div> : null}
            </div>
          )
        },
      },
      {
        key: "status",
        header: "Status",
        cell: (payout) => <StatusBadge status={payout.status} />,
      },
      {
        key: "view",
        header: "",
        className: "w-12 text-right",
        cell: () => <ArrowRight className="ml-auto size-4 text-muted-foreground" />,
      },
    ],
    [],
  )

  const salesColumns: Column<SalesBreakdownItem>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (item) => formatDate(item.conversionDate),
      },
      {
        key: "site",
        header: "Site",
        cell: (item) => item.siteName,
      },
      {
        key: "purchase",
        header: "Purchase",
        className: "text-right",
        headerClassName: "text-right",
        cell: (item) => formatCurrency(item.purchaseAmount, item.currency),
      },
      {
        key: "earned",
        header: "Commission",
        className: "text-right",
        headerClassName: "text-right",
        cell: (item) => formatCurrency(item.earnedCommission, item.currency),
      },
    ],
    [],
  )

  if (authLoading) {
    return <PayoutsPageSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  const requestEnabled = getPayoutRequestEnabled(balance)
  const statIcons = [Banknote, Wallet, Clock3, Wallet] as const

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description="Review your available balance, request a payout, and track settlement history."
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
      />

      {error && !balance && payouts.length === 0 ? (
        <AsyncBoundary
          loading={false}
          error={error}
          loadingFallback={<PayoutsPageSkeleton />}
          onRetry={() => fetchData()}
        >
          <div />
        </AsyncBoundary>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <StatCard
                key={stat.key}
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
                icon={statIcons[index]}
                loading={isLoading && !balance}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Upcoming payout breakdown</CardTitle>
                <CardDescription>Approved commissions currently available for your next payout request.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={salesColumns}
                  data={balance?.salesBreakdown ?? []}
                  rowKey={(item) => item.conversionId}
                  loading={isLoading && !balance}
                  emptyTitle="No approved commissions yet"
                  emptyDescription="Once commissions are approved, they will appear here for payout."
                  className="border-0"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Request a payout</CardTitle>
                <CardDescription>
                  Submit the current available balance when you are ready to be paid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Available now</p>
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatCurrency(balance?.availableBalance ?? 0, balance?.currency)}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Total earned</span>
                    <span>{formatCurrency(balance?.totalEarned ?? 0, balance?.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Already paid out</span>
                    <span>{formatCurrency(balance?.totalPaidOut ?? 0, balance?.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending payouts</span>
                    <span>{formatCurrency(balance?.pendingPayouts ?? 0, balance?.currency)}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleRequestPayout} disabled={!requestEnabled || isRequesting}>
                  {isRequesting ? "Submitting request..." : "Request payout"}
                </Button>

                {!requestEnabled ? (
                  <p className="text-sm text-muted-foreground">
                    You need a positive available balance from approved commissions before requesting a payout.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Payout history</CardTitle>
                <CardDescription>Track review status and settlement outcomes for previous requests.</CardDescription>
              </div>
              <FilterBar
                search={historyQuery}
                onSearchChange={setHistoryQuery}
                searchPlaceholder="Search request ID or status..."
                className="w-full sm:max-w-xs"
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <AsyncBoundary
                loading={false}
                error={error && payouts.length === 0 ? error : null}
                isEmpty={false}
                loadingFallback={<TableSkeleton rows={6} columns={5} />}
                onRetry={() => fetchData()}
              >
                <DataTable
                  columns={payoutColumns}
                  data={filteredPayouts}
                  rowKey={(payout) => payout.id}
                  loading={isLoading && payouts.length === 0}
                  onRowClick={(payout) => router.push(`/payouts/${payout.id}`)}
                  emptyTitle="No payout requests yet"
                  emptyDescription="Your payout request history will appear here after your first request."
                  className="border-0"
                />
              </AsyncBoundary>

              {!historyQuery.trim() ? (
                <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function PayoutsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCard key={index} label="Loading" value="" loading />
        ))}
      </div>
      <TableSkeleton rows={6} columns={4} />
      <TableSkeleton rows={6} columns={5} />
    </div>
  )
}
