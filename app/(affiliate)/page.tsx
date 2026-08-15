"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeftRight,
  Banknote,
  Globe,
  Link2,
  Wallet,
} from "lucide-react"
import {
  AsyncBoundary,
  CardGridSkeleton,
  DataTable,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import {
  dashboardService,
  type AffiliateDashboardData,
  type RecentConversion,
} from "@/lib/api"
import type { RecentPayment } from "@/lib/api/dashboard"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils"

export default function AffiliateDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<AffiliateDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchDashboard = useCallback(async (silent = false) => {
    if (user?.role !== "affiliate") return

    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const response = await dashboardService.getAffiliateDashboard()
      setData(response)
    } catch (loadError) {
      setError(parseApiError(loadError).message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (fetchedRef.current || user?.role !== "affiliate") return
    fetchedRef.current = true
    void fetchDashboard()
  }, [fetchDashboard, user?.role])

  if (authLoading) {
    return <AffiliateDashboardContentSkeleton />
  }

  if (user?.role !== "affiliate") {
    return null
  }

  const conversionColumns: Column<RecentConversion>[] = [
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
      cell: (conversion) => formatDateTime(conversion.date),
    },
    {
      key: "commission",
      header: "Commission",
      cell: (conversion) => formatCurrency(conversion.commission || conversion.commissionAmount || "0"),
    },
    {
      key: "status",
      header: "Status",
      cell: (conversion) => <StatusBadge status={conversion.status} />,
    },
  ]

  const paymentColumns: Column<RecentPayment>[] = [
    {
      key: "payment-id",
      header: "Payment",
      cell: (payment) => <span className="font-medium">#{payment.id}</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (payment) => formatDate(payment.date),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (payment) => formatCurrency(payment.amount),
    },
    {
      key: "status",
      header: "Status",
      cell: (payment) => <StatusBadge status={payment.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        description="Track your performance and earnings."
        onRefresh={() => fetchDashboard(true)}
        isRefreshing={isRefreshing}
      />

      <AsyncBoundary
        loading={isLoading}
        error={error}
        isEmpty={!data}
        loadingFallback={<AffiliateDashboardContentSkeleton />}
        onRetry={() => fetchDashboard()}
        emptyTitle="No dashboard data yet"
        emptyDescription="Your conversion, payout, and referral activity will appear here once it starts coming in."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Earned" value={formatCurrency(data?.totalEarned ?? 0)} icon={Banknote} />
          <StatCard label="Pending Payouts" value={formatCurrency(data?.pendingBalance ?? 0)} icon={Wallet} />
          <StatCard
            label="Conversions"
            value={formatNumber(data?.totalConversions ?? 0)}
            hint={`${formatNumber(data?.approvedConversions ?? 0)} approved, ${formatNumber(data?.pendingConversions ?? 0)} pending`}
            icon={ArrowLeftRight}
          />
          <StatCard label="Active Sites" value={formatNumber(data?.activeSites ?? 0)} icon={Globe} />
          <StatCard label="Referral Codes" value={formatNumber(data?.activeReferralCodes ?? 0)} icon={Link2} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={conversionColumns}
                data={data?.recentConversions?.slice(0, 5) ?? []}
                rowKey={(conversion) => conversion.id}
                emptyTitle="No recent conversions"
                emptyDescription="New conversions will show up here."
                className="border-0"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={paymentColumns}
                data={data?.recentPayments?.slice(0, 5) ?? []}
                rowKey={(payment) => payment.id}
                emptyTitle="No recent payments"
                emptyDescription="Payments issued to you will appear here."
                className="border-0"
              />
            </CardContent>
          </Card>
        </div>
      </AsyncBoundary>
    </div>
  )
}

function AffiliateDashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={5} className="md:grid-cols-2 xl:grid-cols-5" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={4} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={4} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
