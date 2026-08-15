"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Eye, MessageSquareReply, Trash2 } from "lucide-react"
import {
  AsyncBoundary,
  ConfirmDialog,
  DataTable,
  DataTablePagination,
  DetailSheet,
  FilterBar,
  FormDialog,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { contactService, type ContactRequest, type ContactRequestStatus } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { isAdmin, useAuth } from "@/lib/auth-context"
import { formatDateTime } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { useNotification } from "@/components/ui/notification"

const INITIAL_FILTERS = {
  status: "all",
  requestType: "all",
  page: 1,
  pageSize: 20,
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  general_inquiry: "General inquiry",
  technical_support: "Technical support",
  account_issue: "Account issue",
}

export default function AdminRequestsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { success, error: notifyError } = useNotification()
  const { filters, setFilter } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")

  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null)
  const [replyingRequest, setReplyingRequest] = useState<ContactRequest | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<ContactRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [replyOutcome, setReplyOutcome] = useState<"resolved" | "rejected">("resolved")
  const [adminNotes, setAdminNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchRequests = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await contactService.getAll({
          page: filters.page,
          limit: filters.pageSize,
          status: filters.status !== "all" ? filters.status : undefined,
          requestType: filters.requestType !== "all" ? filters.requestType : undefined,
        })
        setRequests(response.data)
        setTotal(response.pagination.total)
      } catch (loadError) {
        const parsed = parseApiError(loadError)
        setError(parsed.message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [filters.page, filters.pageSize, filters.requestType, filters.status],
  )

  useEffect(() => {
    if (authLoading || !isAdmin(user?.role)) return

    const fetchKey = JSON.stringify(filters)
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchRequests()
  }, [authLoading, fetchRequests, filters, user?.role])

  useEffect(() => {
    if (!replyingRequest) return
    setReplyOutcome("resolved")
    setAdminNotes("")
  }, [replyingRequest])

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return requests

    return requests.filter((request) =>
      [
        request.affiliateName,
        request.affiliateEmail,
        request.subject,
        request.message,
        request.status,
      ].some((value) => value?.toLowerCase().includes(query)),
    )
  }, [requests, searchQuery])

  const withSubmitting = async (action: () => Promise<void>) => {
    setIsSubmitting(true)
    try {
      await action()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = async () => {
    if (!replyingRequest || !adminNotes.trim()) return

    await withSubmitting(async () => {
      await contactService.updateStatus(replyingRequest.id, {
        status: replyOutcome as ContactRequestStatus,
        adminNotes: adminNotes.trim(),
      })
      success("Request updated")
      setReplyingRequest(null)
      setSelectedRequest(null)
      await fetchRequests(true)
    })
  }

  const handleDelete = async () => {
    if (!deletingRequest) return

    await withSubmitting(async () => {
      await contactService.delete(deletingRequest.id)
      success("Request deleted")
      setDeletingRequest(null)
      setSelectedRequest(null)
      await fetchRequests(true)
    })
  }

  const columns: Column<ContactRequest>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (request) => (
          <div className="space-y-1">
            <p className="font-medium">{request.affiliateName || "Unknown affiliate"}</p>
            <p className="text-sm text-muted-foreground">{request.affiliateEmail || "No email"}</p>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        cell: (request) => REQUEST_TYPE_LABELS[request.requestType] || request.requestType,
      },
      {
        key: "subject",
        header: "Subject",
        cell: (request) => <span className="font-medium">{request.subject}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (request) => <StatusBadge status={request.status} />,
      },
      {
        key: "date",
        header: "Submitted",
        cell: (request) => <span className="text-sm text-muted-foreground">{formatDateTime(request.createdAt)}</span>,
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[180px]",
        cell: (request) => (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
              <Eye className="size-4" />
              View
            </Button>
            {(request.status === "pending" || request.status === "in_progress") ? (
              <Button variant="outline" size="sm" onClick={() => setReplyingRequest(request)}>
                <MessageSquareReply className="size-4" />
                Reply
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setDeletingRequest(request)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
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
        title="Requests"
        description="Manage incoming affiliate support and account requests."
        onRefresh={() => void fetchRequests(true)}
        isRefreshing={isRefreshing}
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search requests"
        className="rounded-lg border bg-card p-4"
      >
        <Select value={filters.status} onValueChange={(value) => setFilter("status", value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.requestType} onValueChange={(value) => setFilter("requestType", value)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All request types</SelectItem>
            <SelectItem value="general_inquiry">General inquiry</SelectItem>
            <SelectItem value="technical_support">Technical support</SelectItem>
            <SelectItem value="account_issue">Account issue</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <AsyncBoundary
        loading={isLoading && requests.length === 0}
        error={error}
        isEmpty={!isLoading && filteredRequests.length === 0}
        loadingFallback={<TableSkeleton rows={8} columns={6} />}
        onRetry={() => void fetchRequests()}
        emptyTitle="No requests"
        emptyDescription="No requests match the current filters."
      >
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={filteredRequests}
            rowKey={(request) => request.id}
            onRowClick={(request) => setSelectedRequest(request)}
            emptyTitle="No requests"
            emptyDescription="No requests match the current filters."
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
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null)
        }}
        title={selectedRequest?.subject || "Request details"}
        description={selectedRequest ? formatDateTime(selectedRequest.createdAt) : undefined}
        footer={
          selectedRequest && (selectedRequest.status === "pending" || selectedRequest.status === "in_progress") ? (
            <Button onClick={() => setReplyingRequest(selectedRequest)}>
              <MessageSquareReply className="size-4" />
              Reply
            </Button>
          ) : undefined
        }
      >
        {selectedRequest ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <StatusBadge status={selectedRequest.status} />
            </div>
            <div className="space-y-1">
              <Label>Affiliate</Label>
              <p className="text-sm">{selectedRequest.affiliateName || "Unknown affiliate"}</p>
              <p className="text-sm text-muted-foreground">{selectedRequest.affiliateEmail || "No email"}</p>
            </div>
            <div className="space-y-1">
              <Label>Request type</Label>
              <p className="text-sm">{REQUEST_TYPE_LABELS[selectedRequest.requestType] || selectedRequest.requestType}</p>
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {selectedRequest.message}
              </div>
            </div>
            {selectedRequest.adminNotes ? (
              <div className="space-y-1">
                <Label>Latest reply</Label>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {selectedRequest.adminNotes}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DetailSheet>

      <FormDialog
        open={Boolean(replyingRequest)}
        onOpenChange={(open) => {
          if (!open) setReplyingRequest(null)
        }}
        title="Reply to request"
        description={replyingRequest?.affiliateName || undefined}
        onSubmit={() => void handleReply()}
        submitLabel="Send reply"
        loading={isSubmitting}
        submitDisabled={!adminNotes.trim()}
      >
        <div className="space-y-2">
          <Label htmlFor="reply-outcome">Outcome</Label>
          <Select value={replyOutcome} onValueChange={(value) => setReplyOutcome(value as "resolved" | "rejected")}>
            <SelectTrigger id="reply-outcome">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reply-message">Reply message</Label>
          <Textarea
            id="reply-message"
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            rows={5}
            placeholder="Write the response the affiliate should receive."
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deletingRequest)}
        onOpenChange={(open) => {
          if (!open) setDeletingRequest(null)
        }}
        title="Delete request?"
        description={deletingRequest ? `Delete "${deletingRequest.subject}" from ${deletingRequest.affiliateName || "this affiliate"}.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={isSubmitting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
