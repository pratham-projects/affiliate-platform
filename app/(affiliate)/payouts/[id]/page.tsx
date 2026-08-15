"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Banknote, CircleDollarSign, Clock3, ListChecks } from "lucide-react"
import {
  AsyncBoundary,
  DataTable,
  DataTablePagination,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/common/empty-state"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import { parseApiError } from "@/lib/api/errors"
import { payoutsService, type PayoutConversion, type PayoutRequest } from "@/lib/api/payouts"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { getAffiliatePayoutDetailMeta } from "../payouts-view-model"

const PAGE_SIZE = 20

export default function PayoutDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const fetchedRef = useRef(false)

  const [payout, setPayout] = useState<PayoutRequest | null>(null)
  const [conversions, setConversions] = useState<PayoutConversion[]>([])
  const [totalConversions, setTotalConversions] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestId = Number(params.id)

  const fetchData = useCallback(
    async (silent = false) => {
      if (!requestId) return

      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [payoutData, conversionsData] = await Promise.all([
          payoutsService.getById(requestId),
          payoutsService.getConversions(requestId, page, PAGE_SIZE),
        ])

        setPayout(payoutData)
        setConversions(conversionsData.data)
        setTotalConversions(conversionsData.pagination.total)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [page, requestId],
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

  const detailColumns: Column<PayoutConversion>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (conversion) => formatDateTime(conversion.conversionDate),
      },
      {
        key: "site",
        header: "Site",
        cell: (conversion) => (
          <div className="space-y-1">
            <div className="font-medium">{conversion.siteName}</div>
            <div className="text-xs text-muted-foreground capitalize">{conversion.status}</div>
          </div>
        ),
      },
      {
        key: "purchase",
        header: "Purchase",
        className: "text-right",
        headerClassName: "text-right",
        cell: (conversion) => formatCurrency(conversion.purchaseAmount),
      },
      {
        key: "commission",
        header: "Commission",
        className: "text-right",
        headerClassName: "text-right",
        cell: (conversion) => formatCurrency(conversion.earnedCommission),
      },
    ],
    [],
  )

  if (authLoading) {
    return <PayoutDetailSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  if (!requestId || Number.isNaN(requestId)) {
    return <EmptyState title="Invalid payout request" description="The payout request ID is not valid." />
  }

  if (!isLoading && !payout && !error) {
    return <EmptyState title="Payout request not found" description="The requested payout could not be loaded." />
  }

  const metadata = payout ? getAffiliatePayoutDetailMeta(payout) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title={payout ? `Payout #${payout.id}` : "Payout detail"}
        description="Review payout status, included conversions, and settlement notes."
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button variant="outline" onClick={() => router.push("/payouts")}>
            <ArrowLeft className="size-4" />
            Back to payouts
          </Button>
        }
      />

      <AsyncBoundary
        loading={isLoading && !payout}
        error={error}
        loadingFallback={<PayoutDetailSkeleton />}
        onRetry={() => fetchData()}
      >
        {payout ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Requested amount"
                value={formatCurrency(payout.requestedAmount, payout.currency)}
                icon={Banknote}
              />
              <StatCard
                label="Approved amount"
                value={formatCurrency(payout.approvedAmount ?? payout.requestedAmount, payout.currency)}
                icon={CircleDollarSign}
              />
              <StatCard label="Status" value={<StatusBadge status={payout.status} />} icon={Clock3} />
              <StatCard label="Conversions" value={totalConversions} icon={ListChecks} hint="Linked line items" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Request details</CardTitle>
                  <CardDescription>Read-only payout metadata for this settlement request.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metadata.map((row) => (
                    <div key={row.label} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
                      <dt className="text-sm text-muted-foreground">{row.label}</dt>
                      <dd className="text-sm font-medium">{row.value}</dd>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Included conversions</CardTitle>
                  <CardDescription>Commissionable conversions linked to this payout request.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DataTable
                    columns={detailColumns}
                    data={conversions}
                    rowKey={(conversion) => conversion.conversionId}
                    loading={isLoading && conversions.length === 0}
                    emptyTitle="No conversions found"
                    emptyDescription="This payout request does not have any linked conversions."
                    className="border-0"
                  />
                  <DataTablePagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={totalConversions}
                    onPageChange={setPage}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <EmptyState title="Payout request not found" description="The requested payout could not be loaded." />
        )}
      </AsyncBoundary>
    </div>
  )
}

function PayoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCard key={index} label="Loading" value="" loading />
        ))}
      </div>
      <TableSkeleton rows={6} columns={2} />
      <TableSkeleton rows={6} columns={4} />
    </div>
  )
}
