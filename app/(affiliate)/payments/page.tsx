"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Banknote, CircleDollarSign, Eye, Wallet } from "lucide-react"
import {
  AsyncBoundary,
  CardGridSkeleton,
  DataTable,
  DataTablePagination,
  DetailRow,
  DetailSheet,
  FilterBar,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-picker"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import { paymentsService, type MyBalanceResponse, type Payment } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"

const INITIAL_FILTERS = {
  startDate: "",
  endDate: "",
  search: "",
  page: 1,
  pageSize: 20,
}

export default function PaymentsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [balance, setBalance] = useState<MyBalanceResponse | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const lastFetchKeyRef = useRef("")
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)

  const fetchPayments = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [balanceResponse, paymentsResponse] = await Promise.all([
          paymentsService.getMyBalance(),
          paymentsService.getMyPayments({
            page: filters.page,
            limit: filters.pageSize,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
          }),
        ])

        setBalance(balanceResponse)
        setPayments(paymentsResponse.payments)
        setTotal(paymentsResponse.pagination?.total ?? paymentsResponse.payments.length)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [filters.endDate, filters.page, filters.pageSize, filters.startDate],
  )

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
    void fetchPayments()
  }, [authLoading, fetchPayments, filters, user?.role])

  const filteredPayments = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    if (!query) return payments

    return payments.filter((payment) => {
      const haystacks = [
        payment.siteName,
        payment.siteUrl,
        payment.status,
        payment.affiliateName,
        payment.affiliateEmail,
      ]

      return haystacks.some((value) => value?.toLowerCase().includes(query))
    })
  }, [filters.search, payments])

  if (authLoading) {
    return <PaymentsPageSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  const columns: Column<Payment>[] = [
    {
      key: "payment",
      header: "Payment",
      cell: (payment) => (
        <div className="space-y-1">
          <div className="font-medium">#{payment.id}</div>
          <div className="text-xs text-muted-foreground">
            Conversion #{payment.conversionId}
          </div>
        </div>
      ),
    },
    {
      key: "site",
      header: "Site",
      cell: (payment) => (
        <div className="space-y-1">
          <div className="font-medium">{payment.siteName || "Site unavailable"}</div>
          <div className="text-xs text-muted-foreground">{payment.siteUrl || "No URL"}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (payment) => formatCurrency(payment.amount || payment.amountPaid || "0", payment.currency),
    },
    {
      key: "status",
      header: "Status",
      cell: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: "created",
      header: "Created",
      cell: (payment) => formatDateTime(payment.createdAt),
    },
    {
      key: "open",
      header: "",
      className: "w-[72px]",
      cell: (payment) => (
        <Button
          variant="ghost"
          size="icon"
          asChild
          onClick={(event) => event.stopPropagation()}
        >
          <Link href={`/payments/${payment.id}`}>
            <Eye className="size-4" />
            <span className="sr-only">Open payment</span>
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Payments"
          description="Track issued payments, current balances, and payout progress."
          onRefresh={() => fetchPayments(true)}
          isRefreshing={isRefreshing}
        />

        <AsyncBoundary
          loading={isLoading && !balance}
          error={error}
          isEmpty={!balance}
          loadingFallback={<PaymentsPageSkeleton />}
          onRetry={() => fetchPayments()}
          emptyTitle="No payment data yet"
          emptyDescription="Your balance and payment history will appear here once commissions are processed."
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Earned"
                value={formatCurrency(balance?.totalEarned ?? 0)}
                icon={CircleDollarSign}
              />
              <StatCard
                label="Pending Balance"
                value={formatCurrency(balance?.pendingBalance ?? 0)}
                icon={Wallet}
              />
              <StatCard
                label="Approved"
                value={formatCurrency(balance?.approvedAmount ?? 0)}
                hint={`${formatNumber(balance?.approvedPayments ?? 0)} approved payments`}
                icon={Banknote}
              />
              <StatCard
                label="Paid Out"
                value={formatCurrency(balance?.completedAmount ?? balance?.totalPaid ?? 0)}
                hint={`${formatNumber(balance?.completedPayments ?? 0)} completed payments`}
                icon={Banknote}
              />
            </div>

            <Card>
              <CardHeader className="gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Payment History</CardTitle>
                </div>
                <FilterBar
                  search={filters.search}
                  onSearchChange={(value) => setFilter("search", value)}
                  searchPlaceholder="Search site, URL, or status..."
                >
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
                  isEmpty={filteredPayments.length === 0}
                  loadingFallback={<TableSkeleton rows={8} columns={6} />}
                  onRetry={() => fetchPayments()}
                  emptyTitle="No payments found"
                  emptyDescription="Try a different date range or wait for a new payment cycle."
                >
                  <DataTable
                    columns={columns}
                    data={filteredPayments}
                    rowKey={(payment) => payment.id}
                    onRowClick={(payment) => setSelectedPayment(payment)}
                    emptyTitle="No payments found"
                    emptyDescription="Try a different date range or wait for a new payment cycle."
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
        </AsyncBoundary>
      </div>

      <DetailSheet
        open={Boolean(selectedPayment)}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
        title={selectedPayment ? `Payment #${selectedPayment.id}` : "Payment Details"}
        description="Quick detail preview for the selected payment."
        footer={
          selectedPayment ? (
            <Button asChild>
              <Link href={`/payments/${selectedPayment.id}`}>Open full details</Link>
            </Button>
          ) : null
        }
      >
        {selectedPayment && (
          <div>
            <DetailRow label="Payment">
              #{selectedPayment.id}
            </DetailRow>
            <DetailRow label="Conversion">
              #{selectedPayment.conversionId}
            </DetailRow>
            <DetailRow label="Amount">
              {formatCurrency(selectedPayment.amount || selectedPayment.amountPaid || "0", selectedPayment.currency)}
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={selectedPayment.status} />
            </DetailRow>
            <DetailRow label="Created">
              {formatDateTime(selectedPayment.createdAt)}
            </DetailRow>
            <DetailRow label="Approved">
              {selectedPayment.approvedAt ? formatDateTime(selectedPayment.approvedAt) : "Not approved"}
            </DetailRow>
            <DetailRow label="Completed">
              {selectedPayment.completedAt ? formatDateTime(selectedPayment.completedAt) : "Not completed"}
            </DetailRow>
            <DetailRow label="Rejected">
              {selectedPayment.rejectedAt ? formatDateTime(selectedPayment.rejectedAt) : "Not rejected"}
            </DetailRow>
            <DetailRow label="Site">
              {selectedPayment.siteName || "Site unavailable"}
            </DetailRow>
            <DetailRow label="Notes">
              {selectedPayment.notes || "No notes"}
            </DetailRow>
          </div>
        )}
      </DetailSheet>
    </>
  )
}

function PaymentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={8} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}
