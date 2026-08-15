"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeftRight, Banknote, BadgePercent, LayoutDashboard, Trophy, Users, Wallet } from "lucide-react"
import {
  AsyncBoundary,
  DataTable,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, isAdmin, isSuperAdmin } from "@/lib/auth-context"
import { dashboardService, type AdminDashboardData } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils"

interface DashboardConversionRow {
  id: number
  affiliateName: string
  siteName: string
  purchaseAmount: string
  commissionAmount: string
  currency?: string
  status: string
  timestamp: string
}

interface PendingPayoutRow {
  affiliateId: number
  affiliateName: string
  email: string
  totalEarned: string
  pendingBalance: string
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const response = await dashboardService.getAdminDashboard()
      setData(response)
    } catch (loadError) {
      setError(parseApiError(loadError).message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (fetchedRef.current || !isAdmin(user?.role)) return
    fetchedRef.current = true
    void fetchDashboard()
  }, [fetchDashboard, user?.role])

  const conversionColumns: Column<DashboardConversionRow>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate / Site",
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.affiliateName || "Unknown affiliate"}</div>
            <div className="text-xs text-muted-foreground">{row.siteName || "Unknown site"}</div>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Purchase",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatCurrency(row.purchaseAmount || "0", row.currency),
      },
      {
        key: "status",
        header: "Status",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  )

  const payoutColumns: Column<PendingPayoutRow>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.affiliateName}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        ),
      },
      {
        key: "earned",
        header: "Total earned",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatCurrency(row.totalEarned),
      },
      {
        key: "pending",
        header: "Pending balance",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatCurrency(row.pendingBalance),
      },
    ],
    [],
  )

  const stats = [
    {
      label: "Total affiliates",
      value: formatNumber(data?.totalAffiliates ?? 0),
      hint: `${formatNumber(data?.activeAffiliates ?? 0)} active, ${formatNumber(data?.pendingAffiliates ?? 0)} pending`,
      icon: Users,
    },
    {
      label: "Conversions this month",
      value: formatNumber(data?.conversionsThisMonth ?? 0),
      hint: "Current month activity",
      icon: ArrowLeftRight,
    },
    {
      label: isSuperAdmin(user?.role) ? "Commissions this month" : "Avg commission",
      value: isSuperAdmin(user?.role)
        ? formatCurrency(data?.totalCommissionsThisMonth ?? "0")
        : `${Number(data?.averageCommissionPercentage ?? 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%`,
      hint: isSuperAdmin(user?.role) ? "Across approved activity" : "Across current plans",
      icon: isSuperAdmin(user?.role) ? Banknote : BadgePercent,
    },
    {
      label: isSuperAdmin(user?.role) ? "Payouts this month" : "Pending payouts",
      value: isSuperAdmin(user?.role)
        ? formatCurrency(data?.totalPayoutsThisMonth ?? "0")
        : formatCurrency(data?.pendingPayouts ?? "0"),
      hint: isSuperAdmin(user?.role)
        ? `${formatCurrency(data?.pendingPayouts ?? "0")} pending`
        : "Awaiting settlement",
      icon: Wallet,
    },
  ]

  const conversions = (data?.latestConversions ?? []).map((item) => ({
    id: item.id,
    affiliateName: item.affiliateName ?? "Unknown affiliate",
    siteName: item.siteName,
    purchaseAmount: item.purchaseAmount ?? item.amount ?? "0",
    commissionAmount: item.commissionAmount ?? item.commission ?? "0",
    currency: item.currency,
    status: item.status,
    timestamp: item.date || item.conversionDate || "",
  }))

  const topAffiliateHint = data?.topAffiliate
    ? `${formatCurrency(data.topAffiliate.earned)} earned`
    : "No ranking yet"
  const topCodeHint = data?.topCode
    ? `${formatNumber(data.topCode.conversions)} conversions`
    : "No ranking yet"

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of affiliate, conversion, and payout activity."
        onRefresh={() => fetchDashboard(true)}
        isRefreshing={isRefreshing}
      />

      <AsyncBoundary
        loading={isLoading && !data}
        error={error}
        loadingFallback={<AdminDashboardSkeleton />}
        onRetry={() => fetchDashboard()}
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
                icon={stat.icon}
                loading={isLoading && !data}
              />
            ))}
          </div>

          {isSuperAdmin(user?.role) && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Top affiliate"
                value={data?.topAffiliate?.name ?? "No affiliate yet"}
                hint={topAffiliateHint}
                icon={Trophy}
              />
              <StatCard
                label="Top referral code"
                value={data?.topCode?.code ?? "No code yet"}
                hint={topCodeHint}
                icon={LayoutDashboard}
              />
              <StatCard
                label="Awaiting payout"
                value={formatNumber(data?.pendingPayoutsList?.length ?? 0)}
                hint={formatCurrency(data?.pendingPayouts ?? "0")}
                icon={Wallet}
              />
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Latest conversions</CardTitle>
                    <CardDescription>Most recent conversion activity across managed sites.</CardDescription>
                  </div>
                  {conversions.length > 0 && <Badge variant="secondary">Live feed</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataTable
                  columns={conversionColumns}
                  data={conversions}
                  rowKey={(row) => row.id}
                  loading={isLoading && conversions.length === 0}
                  emptyTitle="No recent conversions"
                  emptyDescription="New conversion activity will appear here."
                  className="border-0"
                />
                {conversions.length > 0 && (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {conversions.slice(0, 3).map((row) => (
                      <div key={`meta-${row.id}`} className="flex items-center justify-between gap-3">
                        <span className="truncate">{row.affiliateName}</span>
                        <span>{formatDateTime(row.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Pending payouts</CardTitle>
                <CardDescription>Affiliates with balances waiting to be settled.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={payoutColumns}
                  data={data?.pendingPayoutsList ?? []}
                  rowKey={(row) => row.affiliateId}
                  loading={isLoading && !data}
                  emptyTitle="No pending payouts"
                  emptyDescription="Outstanding balances will appear here."
                  className="border-0"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </AsyncBoundary>
    </div>
  )
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCard key={index} label="Loading" value="" loading />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Latest conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={6} columns={3} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pending payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={6} columns={3} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
