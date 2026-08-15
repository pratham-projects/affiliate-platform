"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Copy, Pencil, Power, Search, Trash2, UserCheck, UserX } from "lucide-react"
import {
  ConfirmDialog,
  DataTable,
  DataTablePagination,
  EmptyState,
  FilterBar,
  FormDialog,
  PageHeader,
  StatCard,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNotification } from "@/components/ui/notification"
import { useAuth, isAdmin } from "@/lib/auth-context"
import { affiliatesService, type Affiliate } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import {
  buildAffiliateFilters,
  formatAffiliateContact,
  getAffiliatePrimaryAction,
} from "./affiliates-view-model"

const PAGE_SIZE = 20

const CONTACT_PLATFORMS = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "skype", label: "Skype" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "email", label: "Email" },
] as const

type ContactFormState = {
  contactPlatform: string
  contactIdentifier: string
  sourceUrl: string
}

const INITIAL_CONTACT_FORM: ContactFormState = {
  contactPlatform: "",
  contactIdentifier: "",
  sourceUrl: "",
}

export default function AffiliatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [searchResults, setSearchResults] = useState<Affiliate[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<"all" | Affiliate["status"]>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null)
  const [deletingAffiliate, setDeletingAffiliate] = useState<Affiliate | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormState>(INITIAL_CONTACT_FORM)

  const fetchAffiliates = useCallback(
    async (nextPage = page, silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const params = buildAffiliateFilters({ page: nextPage, pageSize: PAGE_SIZE, status })
        const response = await affiliatesService.getAll(params)
        setAffiliates(response.affiliates)
        setTotal(response.pagination?.total ?? response.affiliates.length)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load affiliates")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [error, page, status],
  )

  useEffect(() => {
    if (fetchedRef.current || !isAdmin(user?.role)) return
    fetchedRef.current = true
    void fetchAffiliates(1)
  }, [fetchAffiliates, user?.role])

  useEffect(() => {
    const trimmed = searchQuery.trim()

    if (!trimmed) {
      setSearchResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await affiliatesService.search({
          q: trimmed,
          status,
          limit: PAGE_SIZE,
        })
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchQuery, status])

  const data = searchQuery.trim() ? searchResults : affiliates

  const summary = useMemo(() => {
    const pending = data.filter((affiliate) => affiliate.status === "pending").length
    const approved = data.filter((affiliate) => affiliate.status === "approved").length
    const suspended = data.filter((affiliate) => affiliate.status === "suspended").length

    return {
      total: data.length,
      pending,
      approved,
      suspended,
    }
  }, [data])

  const openEditContact = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate)
    setContactForm({
      contactPlatform: affiliate.contactPlatform ?? "",
      contactIdentifier: affiliate.contactIdentifier ?? "",
      sourceUrl: affiliate.sourceUrl ?? "",
    })
  }

  const updateAffiliateInState = (updated: Affiliate) => {
    setAffiliates((current) => current.map((affiliate) => (affiliate.id === updated.id ? updated : affiliate)))
    setSearchResults((current) => current.map((affiliate) => (affiliate.id === updated.id ? updated : affiliate)))
  }

  const handleApprove = async (affiliate: Affiliate) => {
    try {
      const updated = await affiliatesService.approve(affiliate.id)
      updateAffiliateInState(updated)
      success("Affiliate approved")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to approve affiliate")
    }
  }

  const handleReject = async (affiliate: Affiliate) => {
    try {
      const updated = await affiliatesService.reject(affiliate.id)
      updateAffiliateInState(updated)
      success("Affiliate rejected")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to reject affiliate")
    }
  }

  const handleSuspendToggle = async (affiliate: Affiliate) => {
    try {
      const updated = affiliate.status === "suspended"
        ? await affiliatesService.unsuspend(affiliate.id)
        : await affiliatesService.suspend(affiliate.id)
      updateAffiliateInState(updated)
      success(affiliate.status === "suspended" ? "Affiliate reactivated" : "Affiliate suspended")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update affiliate")
    }
  }

  const handleSaveContact = async () => {
    if (!editingAffiliate) return

    if (!contactForm.contactPlatform || !contactForm.contactIdentifier.trim()) {
      error("Contact platform and identifier are required")
      return
    }

    setIsSaving(true)
    try {
      const updated = await affiliatesService.updateContact(editingAffiliate.id, {
        contactPlatform: contactForm.contactPlatform,
        contactIdentifier: contactForm.contactIdentifier.trim(),
        sourceUrl: contactForm.sourceUrl.trim() || undefined,
      })
      updateAffiliateInState(updated)
      setEditingAffiliate(null)
      success("Affiliate contact updated")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update contact")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAffiliate) return

    setIsDeleting(true)
    try {
      const updated = await affiliatesService.delete(deletingAffiliate.id)
      updateAffiliateInState(updated)
      setDeletingAffiliate(null)
      success("Affiliate deleted")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to delete affiliate")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<Affiliate>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Affiliate",
        cell: (affiliate) => (
          <div className="space-y-1">
            <div className="font-medium">{affiliate.fullName}</div>
            <div className="text-xs text-muted-foreground">{affiliate.email}</div>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        cell: (affiliate) => formatAffiliateContact(affiliate.contactPlatform, affiliate.contactIdentifier),
      },
      {
        key: "tracking",
        header: "Tracking ID",
        cell: (affiliate) => affiliate.trackingId || "Not assigned",
      },
      {
        key: "earnings",
        header: "Earnings",
        cell: (affiliate) => (
          <div className="space-y-1">
            <div>{formatCurrency(affiliate.totalEarned)}</div>
            <div className="text-xs text-muted-foreground">Pending {formatCurrency(affiliate.pendingBalance)}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (affiliate) => <Badge variant={affiliate.status === "approved" ? "default" : "secondary"}>{affiliate.status}</Badge>,
      },
      {
        key: "actions",
        header: "",
        className: "w-[220px] text-right",
        cell: (affiliate) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/affiliates/${affiliate.id}`}>
                View
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditContact(affiliate)}>
                  <Pencil className="size-4" />
                  Edit contact
                </DropdownMenuItem>
                {affiliate.status === "pending" ? (
                  <>
                    <DropdownMenuItem onClick={() => handleApprove(affiliate)}>
                      <UserCheck className="size-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReject(affiliate)}>
                      <UserX className="size-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => handleSuspendToggle(affiliate)}>
                    <Power className="size-4" />
                    {getAffiliatePrimaryAction(affiliate.status)}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeletingAffiliate(affiliate)}>
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  )

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Affiliates"
        description="Review applications, manage contact details, and inspect partner performance."
        onRefresh={() => fetchAffiliates(page, true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible affiliates" value={summary.total} />
        <StatCard label="Pending review" value={summary.pending} />
        <StatCard label="Approved" value={summary.approved} />
        <StatCard label="Suspended" value={summary.suspended} />
      </div>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search affiliates"
      >
        <Select
          value={status}
          onValueChange={(value: "all" | Affiliate["status"]) => {
            setStatus(value)
            setPage(1)
            void fetchAffiliates(1, true)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isSearching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="size-4" />
          Searching affiliates...
        </div>
      ) : null}

      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : data.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No affiliates match this search" : "No affiliates found"}
          description={searchQuery ? "Try a different term or status filter." : "New affiliate applications will appear here."}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            rowKey={(affiliate) => affiliate.id}
            onRowClick={(affiliate) => router.push(`/admin/affiliates/${affiliate.id}`)}
          />
          {!searchQuery ? (
            <DataTablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(nextPage) => {
                setPage(nextPage)
                void fetchAffiliates(nextPage)
              }}
            />
          ) : null}
        </>
      )}

      <FormDialog
        open={!!editingAffiliate}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAffiliate(null)
          }
        }}
        title="Edit affiliate contact"
        description="Keep the partner's preferred contact channel and source URL up to date."
        onSubmit={handleSaveContact}
        submitLabel="Save changes"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="affiliate-contact-platform">Platform</Label>
          <Select
            value={contactForm.contactPlatform}
            onValueChange={(value) => setContactForm((current) => ({ ...current, contactPlatform: value }))}
          >
            <SelectTrigger id="affiliate-contact-platform">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_PLATFORMS.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="affiliate-contact-identifier">Contact identifier</Label>
          <Input
            id="affiliate-contact-identifier"
            value={contactForm.contactIdentifier}
            onChange={(event) => setContactForm((current) => ({ ...current, contactIdentifier: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="affiliate-source-url">Source URL</Label>
          <Input
            id="affiliate-source-url"
            value={contactForm.sourceUrl}
            onChange={(event) => setContactForm((current) => ({ ...current, sourceUrl: event.target.value }))}
            placeholder="https://example.com"
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deletingAffiliate}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingAffiliate(null)
          }
        }}
        title="Delete affiliate?"
        description={`Mark ${deletingAffiliate?.fullName ?? "this affiliate"} as deleted.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
