"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Globe,
  Link2,
  RefreshCw,
  User,
  Wallet,
} from "lucide-react"
import {
  AsyncBoundary,
  CardGridSkeleton,
  CopyButton,
  DetailRow,
  DetailSkeleton,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { isAdmin, useAuth } from "@/lib/auth-context"
import { paymentsService, type PaymentConversionDetails } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils"

interface ConversionPaymentDetailProps {
  id: number
  type: "payment" | "conversion"
}

export function ConversionPaymentDetail({ id, type }: ConversionPaymentDetailProps) {
  const { user } = useAuth()
  const [data, setData] = useState<PaymentConversionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef("")
  const isAdminView = isAdmin(user?.role)
  const routePrefix = isAdminView ? "/admin" : ""

  const fetchDetail = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await paymentsService.getDetails(id, type)
        setData(response)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [id, type],
  )

  useEffect(() => {
    const fetchKey = `${type}:${id}`
    if (fetchedRef.current === fetchKey) return
    fetchedRef.current = fetchKey
    void fetchDetail()
  }, [fetchDetail, id, type])

  const recordTitle = type === "payment" ? "Payment" : "Conversion"
  const recordId = type === "payment" ? data?.payment.id : data?.conversion.id
  const recordStatus = type === "payment" ? data?.payment.status : data?.conversion.status

  return (
    <div className="space-y-6">
      <PageHeader
        title={recordId ? `${recordTitle} #${recordId}` : `${recordTitle} Details`}
        description={`Review the full ${type} record, linked entities, and payload data.`}
        onRefresh={() => fetchDetail(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button variant="outline" asChild>
            <Link href={type === "payment" ? `${routePrefix}/payments` : `${routePrefix}/conversions`}>
              <ArrowLeft className="size-4" />
              Back to {type === "payment" ? "payments" : "conversions"}
            </Link>
          </Button>
        }
      />

      <AsyncBoundary
        loading={isLoading}
        error={error}
        isEmpty={!data}
        loadingFallback={<ConversionPaymentDetailSkeleton />}
        onRetry={() => fetchDetail()}
        emptyTitle="Record unavailable"
        emptyDescription="This record could not be loaded."
      >
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Payment Amount"
                value={formatCurrency(data.payment.amount, data.payment.currency)}
                icon={CreditCard}
              />
              <StatCard
                label="Purchase Amount"
                value={formatCurrency(data.conversion.purchaseAmount, data.conversion.currency)}
                icon={Wallet}
              />
              <StatCard
                label="Commission"
                value={formatCurrency(data.conversion.commissionAmount, data.conversion.currency)}
                hint={formatPercent(data.conversion.commissionPercentage)}
                icon={Wallet}
              />
              <StatCard
                label={`${recordTitle} Status`}
                value={<StatusBadge status={recordStatus} />}
                hint={formatDateTime(type === "payment" ? data.payment.createdAt : data.conversion.createdAt)}
                icon={RefreshCw}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Status">
                    <StatusBadge status={data.payment.status} />
                  </DetailRow>
                  <DetailRow label="Amount">
                    {formatCurrency(data.payment.amount, data.payment.currency)}
                  </DetailRow>
                  <DetailRow label="Created">
                    {formatDateTime(data.payment.createdAt)}
                  </DetailRow>
                  <DetailRow label="Approved">
                    {data.payment.approvedAt ? formatDateTime(data.payment.approvedAt) : "Not approved"}
                  </DetailRow>
                  <DetailRow label="Completed">
                    {data.payment.completedAt ? formatDateTime(data.payment.completedAt) : "Not completed"}
                  </DetailRow>
                  <DetailRow label="Rejected">
                    {data.payment.rejectedAt ? formatDateTime(data.payment.rejectedAt) : "Not rejected"}
                  </DetailRow>
                  <DetailRow label="Notes">
                    {data.payment.notes || "No internal notes"}
                  </DetailRow>
                  {data.payment.rejectionReason && (
                    <DetailRow label="Rejection Reason">
                      {data.payment.rejectionReason}
                    </DetailRow>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Conversion Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Status">
                    <StatusBadge status={data.conversion.status} />
                  </DetailRow>
                  <DetailRow label="Type">
                    {data.conversion.conversionType || data.conversion.type || "Unknown"}
                  </DetailRow>
                  <DetailRow label="Conversion Date">
                    {formatDateTime(data.conversion.date)}
                  </DetailRow>
                  <DetailRow label="Purchase Amount">
                    {formatCurrency(data.conversion.purchaseAmount, data.conversion.currency)}
                  </DetailRow>
                  <DetailRow label="Commission">
                    {formatCurrency(data.conversion.commissionAmount, data.conversion.currency)}
                  </DetailRow>
                  <DetailRow label="Commission Rate">
                    {formatPercent(data.conversion.commissionPercentage)}
                  </DetailRow>
                  <DetailRow label="Customer Email">
                    {data.conversion.customerEmail || "Unavailable"}
                  </DetailRow>
                  <DetailRow label="Test Event">
                    {data.conversion.isTest ? "Yes" : "No"}
                  </DetailRow>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Affiliate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">{data.affiliate.name}</p>
                      <p className="text-sm text-muted-foreground">{data.affiliate.email}</p>
                    </div>
                    {isAdminView && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`${routePrefix}/affiliates/${data.affiliate.id}`}>
                          <ArrowUpRight className="size-4" />
                          Open affiliate
                        </Link>
                      </Button>
                    )}
                  </div>
                  <DetailRow label="Status">
                    <StatusBadge status={data.affiliate.status} />
                  </DetailRow>
                  <DetailRow label="Pending Balance">
                    {formatCurrency(data.affiliate.pendingBalance)}
                  </DetailRow>
                  <DetailRow label="Total Earned">
                    {formatCurrency(data.affiliate.totalEarned)}
                  </DetailRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Site & Referral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{data.site.name}</p>
                      <p className="text-sm text-muted-foreground">Site #{data.site.id}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${routePrefix}/sites/${data.site.id}`}>
                        <Globe className="size-4" />
                        Open site
                      </Link>
                    </Button>
                  </div>
                  <DetailRow label="Site Status">
                    <StatusBadge status={data.site.status} />
                  </DetailRow>
                  <DetailRow label="Referral Code">
                    {data.referralCode ? (
                      <div className="flex items-center justify-end gap-2">
                        <span>{data.referralCode.code}</span>
                        <CopyButton value={data.referralCode.code} size="icon" className="size-8" />
                      </div>
                    ) : (
                      "No referral code"
                    )}
                  </DetailRow>
                  {data.referralCode && (
                    <DetailRow label="Referral Status">
                      <StatusBadge status={data.referralCode.isActive ? "active" : "inactive"} />
                    </DetailRow>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.conversion.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Attribution Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailRow label="Referrer">
                      {data.conversion.metadata.clickReferrer || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="Landing Page">
                      {data.conversion.metadata.landingPage || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="Country">
                      {data.conversion.metadata.country || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="City">
                      {data.conversion.metadata.city || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="Operating System">
                      {data.conversion.metadata.os || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="Browser">
                      {data.conversion.metadata.browser || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="IP Address">
                      {data.conversion.metadata.ipAddress || "Unavailable"}
                    </DetailRow>
                    <DetailRow label="User Agent">
                      {data.conversion.metadata.userAgent || "Unavailable"}
                    </DetailRow>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.conversion.rawPayload && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <CardTitle className="text-base font-semibold">Raw Payload</CardTitle>
                  <CopyButton
                    value={JSON.stringify(data.conversion.rawPayload, null, 2)}
                    label="Copy JSON"
                    size="sm"
                  />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px] rounded-md border bg-muted/20">
                    <pre className="p-4 text-xs leading-6 text-foreground">
                      {JSON.stringify(data.conversion.rawPayload, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </div>
  )
}

function ConversionPaymentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailSkeleton rows={6} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Conversion Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailSkeleton rows={6} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
