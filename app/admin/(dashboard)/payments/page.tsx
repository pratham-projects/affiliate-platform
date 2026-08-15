"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, CheckCircle2, Eye, X } from "lucide-react"
import {
  AsyncBoundary,
  ConfirmDialog,
  DataTable,
  DataTablePagination,
  DetailRow,
  DetailSheet,
  FilterBar,
  FormDialog,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotification } from "@/components/ui/notification"
import { SearchDropdown, type SearchDropdownOption } from "@/components/ui/search-dropdown"
import { affiliatesService, paymentsService, type Payment } from "@/lib/api"
import type { PaymentStats } from "@/lib/api/payments"
import { parseApiError } from "@/lib/api/errors"
import { isAdmin, useAuth } from "@/lib/auth-context"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { mapAffiliateToOption } from "@/lib/utils/search-mapping"
import {
  buildAdminPaymentParams,
  getPaymentAmount,
  getPaymentDate,
} from "./payments-view-model"

const INITIAL_FILTERS = {
  status: "all",
  affiliateId: "all",
  page: 1,
  pageSize: 20,
  tab: "pending",
}

export default function PaymentsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { success, error: notifyError } = useNotification()
  const { filters, setFilter } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")

  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [approveAllOpen, setApproveAllOpen] = useState(false)
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false)
  const [singleApprovePayment, setSingleApprovePayment] = useState<Payment | null>(null)
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [affiliateOptions, setAffiliateOptions] = useState<SearchDropdownOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchPayments = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [statsResponse, paymentsResponse] = await Promise.all([
          paymentsService.getStats(filters.affiliateId !== "all" ? Number(filters.affiliateId) : undefined),
          paymentsService.getAll(buildAdminPaymentParams(filters)),
        ])

        setStats(statsResponse)
        setPayments(paymentsResponse.payments)
        setTotal(paymentsResponse.pagination?.total ?? paymentsResponse.payments.length)
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
    if (filters.affiliateId === "all") return

    affiliatesService
      .getById(Number(filters.affiliateId))
      .then((affiliate) => {
        if (!affiliate) return
        setAffiliateOptions((current) => {
          if (current.some((option) => option.value === String(affiliate.id))) return current
          return [...current, mapAffiliateToOption(affiliate)]
        })
      })
      .catch(() => undefined)
  }, [filters.affiliateId])

  useEffect(() => {
    if (authLoading || !isAdmin(user?.role)) return

    const fetchKey = JSON.stringify(buildAdminPaymentParams(filters))
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchPayments()
  }, [authLoading, fetchPayments, filters, user?.role])

  useEffect(() => {
    setSelectedIds([])
  }, [filters.tab, filters.affiliateId, filters.status, filters.page])

  const handleAffiliateSearch = async (query: string) => {
    try {
      const results = await affiliatesService.search({ q: query, status: "approved" })
      setAffiliateOptions(results.map(mapAffiliateToOption))
    } catch {
      setAffiliateOptions([])
    }
  }

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return payments

    return payments.filter((payment) =>
      [
        payment.affiliateName,
        payment.affiliateEmail,
        payment.siteName,
        payment.siteUrl,
        payment.status,
        String(payment.id),
      ].some((value) => value?.toLowerCase().includes(query)),
    )
  }, [payments, searchQuery])

  const currentPageIds = filteredPayments.map((payment) => payment.id)
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id))

  const toggleSelect = (id: number) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    ))
  }

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds((current) => current.filter((id) => !currentPageIds.includes(id)))
      return
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...currentPageIds])))
  }

  const refreshData = useCallback(async () => {
    setSelectedIds([])
    await fetchPayments(true)
  }, [fetchPayments])

  const withProcessing = async (action: () => Promise<void>) => {
    setIsProcessing(true)
    try {
      await action()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async (id: number) => {
    await withProcessing(async () => {
      await paymentsService.approve(id)
      success("Payment approved")
      setSingleApprovePayment(null)
      await refreshData()
    })
  }

  const handleBulkApprove = async () => {
    await withProcessing(async () => {
      await paymentsService.bulkApprove(selectedIds)
      success("Selected payments approved")
      setBulkApproveOpen(false)
      await refreshData()
    })
  }

  const handleApproveAll = async () => {
    await withProcessing(async () => {
      await paymentsService.approveAll(filters.affiliateId !== "all" ? Number(filters.affiliateId) : undefined)
      success("All pending payments approved")
      setApproveAllOpen(false)
      await refreshData()
    })
  }

  const handleReject = async () => {
    if (!rejectingPayment || !rejectionReason.trim()) return

    await withProcessing(async () => {
      await paymentsService.reject(rejectingPayment.id, rejectionReason.trim())
      success("Payment rejected")
      setRejectingPayment(null)
      setRejectionReason("")
      await refreshData()
    })
  }

  const columns: Column<Payment>[] = useMemo(
    () => {
      const items: Column<Payment>[] = []

      if (filters.tab === "pending") {
        items.push({
          key: "select",
          header: (
            <Checkbox
              checked={allCurrentSelected}
              onCheckedChange={() => toggleSelectAll()}
              aria-label="Select all payments"
            />
          ),
          className: "w-12",
          headerClassName: "w-12",
          cell: (payment) => (
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={selectedIds.includes(payment.id)}
                onCheckedChange={() => toggleSelect(payment.id)}
                aria-label={`Select payment ${payment.id}`}
              />
            </div>
          ),
        })
      }

      items.push(
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
          key: "affiliate",
          header: "Affiliate",
          cell: (payment) => (
            <div className="space-y-1">
              <div className="font-medium">{payment.affiliateName}</div>
              <div className="text-xs text-muted-foreground">{payment.affiliateEmail || "No email"}</div>
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
          cell: (payment) => formatCurrency(getPaymentAmount(payment), payment.currency),
        },
        {
          key: "status",
          header: "Status",
          cell: (payment) => <StatusBadge status={payment.status} />,
        },
        {
          key: "created",
          header: "Created",
          cell: (payment) => formatDateTime(getPaymentDate(payment)),
        },
        {
          key: "actions",
          header: "",
          className: "w-[140px] text-right",
          cell: (payment) => (
            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                <Eye className="size-4" />
                View
              </Button>
              {payment.status === "pending" ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setSingleApprovePayment(payment)}>
                    <Check className="size-4" />
                    <span className="sr-only">Approve payment</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setRejectingPayment(payment)
                      setRejectionReason("")
                    }}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Reject payment</span>
                  </Button>
                </>
              ) : null}
            </div>
          ),
        },
      )

      return items
    },
    [allCurrentSelected, filters.tab, selectedIds],
  )

  if (authLoading) {
    return <PaymentsLoadingState />
  }

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Review commissions, approve pending payouts, and track payment history."
        onRefresh={() => fetchPayments(true)}
        isRefreshing={isRefreshing}
        actions={
          filters.tab === "pending" ? (
            <>
              {selectedIds.length ? (
                <Button onClick={() => setBulkApproveOpen(true)}>
                  <CheckCircle2 className="size-4" />
                  Approve selected ({selectedIds.length})
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setApproveAllOpen(true)}>
                Approve all pending
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Approval"
          value={formatCurrency(stats?.pending.total ?? 0)}
          hint={`${formatNumber(stats?.pending.count ?? 0)} pending payments`}
          loading={isLoading && !stats}
        />
        <StatCard
          label="Approved"
          value={formatCurrency(stats?.approved.total ?? 0)}
          hint={`${formatNumber(stats?.approved.count ?? 0)} approved payments`}
          loading={isLoading && !stats}
        />
        <StatCard
          label="Completed"
          value={formatCurrency(stats?.completed.total ?? 0)}
          hint={`${formatNumber(stats?.completed.count ?? 0)} completed payments`}
          loading={isLoading && !stats}
        />
        <StatCard
          label="Rejected"
          value={formatCurrency(stats?.rejected.total ?? 0)}
          hint={`${formatNumber(stats?.rejected.count ?? 0)} rejected payments`}
          loading={isLoading && !stats}
        />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-semibold">Payment Queue</CardTitle>
            <Tabs value={filters.tab} onValueChange={(value) => setFilter("tab", value)}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="history">All payments</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <FilterBar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search payment, affiliate, or site..."
          >
            <SearchDropdown
              value={filters.affiliateId}
              onChange={(value) => setFilter("affiliateId", value)}
              options={affiliateOptions}
              onSearch={handleAffiliateSearch}
              placeholder="Affiliate"
              allowClear
            />
            {filters.tab === "history" ? (
              <Select value={filters.status} onValueChange={(value) => setFilter("status", value)}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </FilterBar>
        </CardHeader>
        <CardContent className="space-y-4">
          <AsyncBoundary
            loading={isLoading}
            error={error}
            isEmpty={!filteredPayments.length}
            loadingFallback={<TableSkeleton rows={8} columns={filters.tab === "pending" ? 8 : 7} />}
            onRetry={() => fetchPayments()}
            emptyTitle="No payments found"
            emptyDescription="Try a different filter or wait for new commission records."
          >
            <>
              <DataTable
                columns={columns}
                data={filteredPayments}
                rowKey={(payment) => payment.id}
                onRowClick={(payment) => {
                  setSelectedPayment(null)
                  window.location.href = `/admin/payments/${payment.id}`
                }}
              />
              <DataTablePagination
                page={filters.page}
                pageSize={filters.pageSize}
                total={searchQuery.trim() ? filteredPayments.length : total}
                onPageChange={(page) => setFilter("page", page)}
                className="pt-2"
              />
            </>
          </AsyncBoundary>
        </CardContent>
      </Card>

      <DetailSheet
        open={!!selectedPayment}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null)
        }}
        title={selectedPayment ? `Payment #${selectedPayment.id}` : "Payment details"}
        description="Quick review of the selected payment."
        footer={
          selectedPayment ? (
            <Button asChild>
              <Link href={`/admin/payments/${selectedPayment.id}`}>Open full detail page</Link>
            </Button>
          ) : undefined
        }
      >
        {selectedPayment ? (
          <>
            <DetailRow label="Affiliate">{selectedPayment.affiliateName}</DetailRow>
            <DetailRow label="Affiliate Email">{selectedPayment.affiliateEmail || "Unavailable"}</DetailRow>
            <DetailRow label="Site">{selectedPayment.siteName || "Unavailable"}</DetailRow>
            <DetailRow label="Amount">
              {formatCurrency(getPaymentAmount(selectedPayment), selectedPayment.currency)}
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={selectedPayment.status} />
            </DetailRow>
            <DetailRow label="Created">{formatDateTime(getPaymentDate(selectedPayment))}</DetailRow>
            <DetailRow label="Notes">{selectedPayment.notes || "No notes"}</DetailRow>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={approveAllOpen}
        onOpenChange={setApproveAllOpen}
        title="Approve all pending payments?"
        description="This moves every pending payment in the current filter scope to approved."
        confirmLabel={isProcessing ? "Processing..." : "Approve all"}
        loading={isProcessing}
        onConfirm={() => {
          void handleApproveAll().catch((submitError) => notifyError(parseApiError(submitError).message))
        }}
      />

      <ConfirmDialog
        open={bulkApproveOpen}
        onOpenChange={setBulkApproveOpen}
        title="Approve selected payments?"
        description={`Approve ${selectedIds.length} selected pending payments.`}
        confirmLabel={isProcessing ? "Processing..." : "Approve selected"}
        loading={isProcessing}
        onConfirm={() => {
          void handleBulkApprove().catch((submitError) => notifyError(parseApiError(submitError).message))
        }}
      />

      <ConfirmDialog
        open={!!singleApprovePayment}
        onOpenChange={(open) => {
          if (!open) setSingleApprovePayment(null)
        }}
        title="Approve payment?"
        description="This payment will move from pending to approved."
        confirmLabel={isProcessing ? "Processing..." : "Approve"}
        loading={isProcessing}
        onConfirm={() => {
          if (!singleApprovePayment) return
          void handleApprove(singleApprovePayment.id).catch((submitError) => notifyError(parseApiError(submitError).message))
        }}
      />

      <FormDialog
        open={!!rejectingPayment}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingPayment(null)
            setRejectionReason("")
          }
        }}
        title={rejectingPayment ? `Reject payment #${rejectingPayment.id}` : "Reject payment"}
        description="Provide a reason that the affiliate can review later."
        submitLabel={isProcessing ? "Processing..." : "Reject payment"}
        loading={isProcessing}
        submitDisabled={!rejectionReason.trim()}
        onSubmit={() => {
          void handleReject().catch((submitError) => notifyError(parseApiError(submitError).message))
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Reason</Label>
          <Input
            id="rejection-reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Duplicate request, fraud check, or payout mismatch"
          />
        </div>
      </FormDialog>
    </div>
  )
}

function PaymentsLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Approval" value="" loading />
        <StatCard label="Approved" value="" loading />
        <StatCard label="Completed" value="" loading />
        <StatCard label="Rejected" value="" loading />
      </div>
      <TableSkeleton rows={8} columns={7} />
    </div>
  )
}
