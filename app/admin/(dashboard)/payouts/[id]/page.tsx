"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, FileText, Mail, RefreshCw, ShieldAlert, Wallet } from "lucide-react"
import {
  AsyncBoundary,
  ConfirmDialog,
  DataTable,
  DetailRow,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { payoutsService, type PayoutRequest } from "@/lib/api"
import type { PayoutConversion } from "@/lib/api/payouts"
import { parseApiError } from "@/lib/api/errors"
import { isAdmin, isSuperAdmin, useAuth } from "@/lib/auth-context"
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { useNotification } from "@/components/ui/notification"

export default function AdminPayoutDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { success, error: notifyError } = useNotification()

  const requestId = Number(id)
  const canManage = isAdmin(user?.role)
  const canComplete = isSuperAdmin(user?.role)

  const [payout, setPayout] = useState<PayoutRequest | null>(null)
  const [conversions, setConversions] = useState<PayoutConversion[]>([])
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set())
  const [notes, setNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [cancelApprovalOpen, setCancelApprovalOpen] = useState(false)

  const fetchPayout = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [payoutResponse, conversionsResponse] = await Promise.all([
          payoutsService.getById(requestId),
          payoutsService.getConversions(requestId, 1, 100),
        ])

        if (!payoutResponse) {
          router.push("/admin/payouts")
          return
        }

        setPayout(payoutResponse)
        setConversions(conversionsResponse.data)
        setExcludedIds(new Set(payoutResponse.excludedConversionIds || []))
        setNotes(payoutResponse.notes || "")
        setPage(1)
        setHasMore(
          conversionsResponse.pagination.page < conversionsResponse.pagination.totalPages,
        )
      } catch (loadError) {
        const parsed = parseApiError(loadError)
        setError(parsed.message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [requestId, router],
  )

  useEffect(() => {
    if (authLoading || !canManage || !requestId) return
    void fetchPayout()
  }, [authLoading, canManage, fetchPayout, requestId])

  const toggleExclusion = (conversionId: number) => {
    if (!payout || payout.status !== "pending" || !canManage || isProcessing) return

    setExcludedIds((current) => {
      const next = new Set(current)
      if (next.has(conversionId)) {
        next.delete(conversionId)
      } else {
        next.add(conversionId)
      }
      return next
    })
  }

  const includedCount = conversions.length - excludedIds.size
  const approvedAmount = useMemo(() => {
    if (!conversions.length) {
      return Number(payout?.approvedAmount || payout?.requestedAmount || 0)
    }

    return conversions
      .filter((conversion) => !excludedIds.has(conversion.conversionId))
      .reduce((sum, conversion) => sum + Number(conversion.earnedCommission || 0), 0)
  }, [conversions, excludedIds, payout?.approvedAmount, payout?.requestedAmount])

  const withProcessing = async (action: () => Promise<void>) => {
    setIsProcessing(true)
    try {
      await action()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async () => {
    if (!payout) return

    await withProcessing(async () => {
      await payoutsService.approveRequest(
        payout.id,
        excludedIds.size ? Array.from(excludedIds) : undefined,
        notes.trim() || undefined,
      )
      setApproveOpen(false)
      success("Payout approved")
      await fetchPayout(true)
    })
  }

  const handleReject = async () => {
    if (!payout || !rejectionReason.trim()) return

    await withProcessing(async () => {
      await payoutsService.rejectRequest(
        payout.id,
        rejectionReason.trim(),
        notes.trim() || undefined,
      )
      setRejectOpen(false)
      setRejectionReason("")
      success("Payout rejected")
      await fetchPayout(true)
    })
  }

  const handleComplete = async () => {
    if (!payout) return

    await withProcessing(async () => {
      await payoutsService.completeRequest(payout.id, notes.trim() || undefined)
      setCompleteOpen(false)
      success("Payout marked as completed")
      await fetchPayout(true)
    })
  }

  const handleCancelApproval = async () => {
    if (!payout) return

    await withProcessing(async () => {
      await payoutsService.cancelApproval(payout.id, notes.trim() || undefined)
      setCancelApprovalOpen(false)
      success("Approval cancelled")
      await fetchPayout(true)
    })
  }

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const response = await payoutsService.getConversions(requestId, nextPage, 100)
      setConversions((current) => [...current, ...response.data])
      setPage(nextPage)
      setHasMore(response.pagination.page < response.pagination.totalPages)
    } catch {
      notifyError("Failed to load more conversions")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const columns: Column<PayoutConversion>[] = useMemo(() => {
    const items: Column<PayoutConversion>[] = []

    if (canManage) {
      items.push({
        key: "select",
        header: "",
        className: "w-12",
        headerClassName: "w-12",
        cell: (conversion) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={!excludedIds.has(conversion.conversionId)}
              onCheckedChange={() => toggleExclusion(conversion.conversionId)}
              disabled={payout?.status !== "pending" || isProcessing}
              aria-label={`Toggle conversion ${conversion.conversionId}`}
            />
          </div>
        ),
      })
    }

    items.push(
      {
        key: "date",
        header: "Date",
        cell: (conversion) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(conversion.conversionDate)}
          </span>
        ),
      },
      {
        key: "site",
        header: "Site",
        cell: (conversion) => (
          <div className="space-y-1">
            <p className="font-medium">{conversion.siteName}</p>
            <StatusBadge status={conversion.status} />
          </div>
        ),
      },
      {
        key: "purchase",
        header: "Purchase",
        cell: (conversion) => (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(conversion.purchaseAmount)}
          </span>
        ),
      },
      {
        key: "commission",
        header: "Commission",
        cell: (conversion) => (
          <span
            className={cn(
              "font-medium",
              excludedIds.has(conversion.conversionId) && "text-muted-foreground line-through",
            )}
          >
            {formatCurrency(conversion.earnedCommission)}
          </span>
        ),
      },
    )

    return items
  }, [canManage, excludedIds, isProcessing, payout?.status])

  if (authLoading || !canManage) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={payout ? `Payout #${payout.id}` : "Payout"}
        description={payout ? `Requested by ${payout.affiliateName}` : "Settlement details"}
        onRefresh={() => void fetchPayout(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button variant="outline" onClick={() => router.push("/admin/payouts")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <AsyncBoundary
        loading={isLoading}
        error={error}
        isEmpty={!payout}
        loadingFallback={<TableSkeleton rows={8} columns={4} />}
        onRetry={() => void fetchPayout()}
        emptyTitle="Payout not found"
        emptyDescription="The requested payout could not be loaded."
      >
        {payout ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Requested" value={formatCurrency(payout.requestedAmount, payout.currency)} icon={Wallet} />
              <StatCard label="Approved" value={formatCurrency(approvedAmount, payout.currency)} icon={CheckCircle2} />
              <StatCard label="Included Items" value={includedCount} icon={Clock} />
              <StatCard label="Status" value={<StatusBadge status={payout.status} />} icon={ShieldAlert} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Conversions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={conversions}
                    rowKey={(conversion) => conversion.conversionId}
                    onRowClick={
                      canManage && payout.status === "pending"
                        ? (conversion) => toggleExclusion(conversion.conversionId)
                        : undefined
                    }
                    emptyTitle="No conversions"
                    emptyDescription="This payout request has no linked conversions."
                  />
                  {hasMore ? (
                    <Button variant="outline" onClick={() => void handleLoadMore()} disabled={isLoadingMore}>
                      {isLoadingMore ? "Loading..." : "Load more conversions"}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Request Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <DetailRow label="Affiliate">{payout.affiliateName}</DetailRow>
                    <DetailRow label="Email">{payout.affiliateEmail}</DetailRow>
                    <DetailRow label="Affiliate ID">#{payout.affiliateId}</DetailRow>
                    <DetailRow label="Requested">{formatDateTime(payout.createdAt)}</DetailRow>
                    <DetailRow label="Approved At">{formatDateTime(payout.approvedAt)}</DetailRow>
                    <DetailRow label="Completed At">{formatDateTime(payout.completedAt)}</DetailRow>
                    <DetailRow label="Rejected At">{formatDateTime(payout.rejectedAt)}</DetailRow>
                    <DetailRow label="Status">
                      <StatusBadge status={payout.status} />
                    </DetailRow>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Processing Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Internal notes for payout processing"
                      disabled={payout.status !== "pending" || isProcessing}
                    />
                    {payout.rejectionReason ? (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                        {payout.rejectionReason}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {payout.status === "pending" ? (
                      <>
                        <Button
                          className="w-full"
                          onClick={() => setApproveOpen(true)}
                          disabled={isProcessing || (conversions.length > 0 && includedCount === 0)}
                        >
                          Approve payout
                        </Button>
                        <div className="space-y-2">
                          <Label htmlFor="rejection-reason">Rejection reason</Label>
                          <Input
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            placeholder="Explain why this request is being rejected"
                          />
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => setRejectOpen(true)}
                            disabled={isProcessing || !rejectionReason.trim()}
                          >
                            Reject payout
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {payout.status === "approved" && canComplete ? (
                      <>
                        <Button className="w-full" onClick={() => setCompleteOpen(true)} disabled={isProcessing}>
                          Mark completed
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setCancelApprovalOpen(true)}
                          disabled={isProcessing}
                        >
                          Cancel approval
                        </Button>
                      </>
                    ) : null}

                    {payout.status === "approved" && !canComplete ? (
                      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                        Completion requires a super admin account.
                      </div>
                    ) : null}

                    {payout.status === "completed" ? (
                      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                        Funds were marked completed on {formatDateTime(payout.completedAt)}.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Audit Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-4" />
                      <span>Affiliate communications use the stored account email.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 size-4" />
                      <span>Excluded conversions are removed from the approved settlement amount.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </AsyncBoundary>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve payout request?"
        description={`Approve ${formatCurrency(approvedAmount, payout?.currency)} for payout #${payout?.id}.`}
        confirmLabel="Approve"
        loading={isProcessing}
        onConfirm={() => void handleApprove()}
      />
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject payout request?"
        description={rejectionReason.trim() || "This request will be rejected."}
        confirmLabel="Reject"
        destructive
        loading={isProcessing}
        onConfirm={() => void handleReject()}
      />
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Mark payout as completed?"
        description={`Confirm transfer of ${formatCurrency(payout?.approvedAmount || approvedAmount, payout?.currency)}.`}
        confirmLabel="Mark completed"
        loading={isProcessing}
        onConfirm={() => void handleComplete()}
      />
      <ConfirmDialog
        open={cancelApprovalOpen}
        onOpenChange={setCancelApprovalOpen}
        title="Cancel approval?"
        description="This moves the payout back to pending so the audit can be updated."
        confirmLabel="Cancel approval"
        loading={isProcessing}
        onConfirm={() => void handleCancelApproval()}
      />
    </div>
  )
}
