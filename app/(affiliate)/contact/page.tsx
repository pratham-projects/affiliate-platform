"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Send } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  AsyncBoundary,
  DataTable,
  DataTablePagination,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { contactService, type ContactRequest, type ContactRequestType } from "@/lib/api/contact"
import { parseApiError } from "@/lib/api/errors"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import { formatDateTime } from "@/lib/utils"
import {
  buildContactSubmitPayload,
  getContactSubmitDisabled,
  getContactTypeLabel,
} from "./contact-view-model"

const PAGE_SIZE = 20

const REQUEST_TYPES: ContactRequestType[] = ["general_inquiry", "technical_support", "account_issue"]

export default function ContactPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { success, error: notifyError } = useNotification()
  const fetchedRef = useRef(false)

  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [requestType, setRequestType] = useState<ContactRequestType>("general_inquiry")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await contactService.getMyRequests({ page, limit: PAGE_SIZE })
        setRequests(response.data)
        setTotal(response.pagination.total)
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
    void fetchRequests()
  }, [authLoading, user, router, fetchRequests])

  useEffect(() => {
    if (!fetchedRef.current) return
    void fetchRequests(true)
  }, [page, fetchRequests])

  const handleSubmit = useCallback(async () => {
    if (getContactSubmitDisabled({ subject, message })) return

    setIsSubmitting(true)
    try {
      await contactService.submit(
        buildContactSubmitPayload({
          subject,
          message,
          requestType,
        }),
      )
      success("Your request has been submitted")
      setSubject("")
      setMessage("")
      setRequestType("general_inquiry")
      await fetchRequests(true)
    } catch (submitError) {
      notifyError(parseApiError(submitError).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [fetchRequests, message, notifyError, requestType, subject, success])

  const requestColumns: Column<ContactRequest>[] = useMemo(
    () => [
      {
        key: "type",
        header: "Type",
        cell: (request) => getContactTypeLabel(request.requestType),
      },
      {
        key: "subject",
        header: "Subject",
        cell: (request) => (
          <div className="space-y-1">
            <div className="font-medium">{request.subject}</div>
            <div className="line-clamp-2 text-sm text-muted-foreground">{request.message}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (request) => <StatusBadge status={request.status} />,
      },
      {
        key: "notes",
        header: "Admin notes",
        cell: (request) => request.adminNotes || "—",
      },
      {
        key: "created",
        header: "Submitted",
        cell: (request) => formatDateTime(request.createdAt),
      },
    ],
    [],
  )

  if (authLoading) {
    return <TableSkeleton rows={6} columns={4} />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  const submitDisabled = getContactSubmitDisabled({ subject, message })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact support"
        description="Send a request to the team and track responses from your dashboard."
        onRefresh={() => fetchRequests(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">New request</CardTitle>
            <CardDescription>Tell us what you need help with and include enough detail to unblock support.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requestType">Request type</Label>
              <Select value={requestType} onValueChange={(value) => setRequestType(value as ContactRequestType)}>
                <SelectTrigger id="requestType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getContactTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Brief summary of the issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the issue or request in detail"
                rows={7}
              />
              <p className="text-sm text-muted-foreground">{message.length}/2000 characters</p>
            </div>

            <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={submitDisabled || isSubmitting}>
              <Send className="size-4" />
              {isSubmitting ? "Submitting..." : "Submit request"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Request history</CardTitle>
            <CardDescription>Track the current status and any notes added by the team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AsyncBoundary
              loading={false}
              error={error}
              loadingFallback={<TableSkeleton rows={6} columns={5} />}
              onRetry={() => fetchRequests()}
            >
              {requests.length === 0 && !isLoading ? (
                <EmptyState
                  title="No requests yet"
                  description="Your submitted support requests will appear here."
                />
              ) : (
                <>
                  <DataTable
                    columns={requestColumns}
                    data={requests}
                    rowKey={(request) => request.id}
                    loading={isLoading && requests.length === 0}
                    emptyTitle="No requests yet"
                    emptyDescription="Your submitted support requests will appear here."
                    className="border-0"
                  />
                  <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
                </>
              )}
            </AsyncBoundary>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
