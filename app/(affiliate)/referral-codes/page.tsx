"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MoreHorizontal, Plus, Power } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  AsyncBoundary,
  CopyButton,
  DataTable,
  DataTablePagination,
  FilterBar,
  FormDialog,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNotification } from "@/components/ui/notification"
import { affiliatesService, referralCodesService, type ReferralCode } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { isAffiliate, useAuth } from "@/lib/auth-context"
import { formatDate, formatNumber } from "@/lib/utils"
import { validateReferralCode } from "@/lib/utils/referral-code"
import {
  buildReferralCodeFilters,
  buildReferralCodeFormState,
  getReferralCodeStatusLabel,
} from "./referral-code-view-model"

const PAGE_SIZE = 20

type FormState = {
  siteId: string
  code: string
  label: string
}

export default function ReferralCodesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { success, error: notifyError } = useNotification()
  const fetchedRef = useRef(false)

  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [currentAffiliateId, setCurrentAffiliateId] = useState<number | null>(null)
  const [siteOptions, setSiteOptions] = useState<Array<{ id: number; name: string; baseUrl: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [siteFilter, setSiteFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>(buildReferralCodeFormState(null))

  const fetchCodes = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const filterParams = buildReferralCodeFilters({
          status: statusFilter,
          site: siteFilter,
          page,
          pageSize: PAGE_SIZE,
        })

        const [affiliate, trackingLinks, response] = await Promise.all([
          currentAffiliateId ? Promise.resolve({ id: currentAffiliateId }) : affiliatesService.getMe(),
          affiliatesService.getTrackingLinks(),
          referralCodesService.getMyReferralCodes(filterParams),
        ])

        setCurrentAffiliateId(affiliate?.id ?? null)
        setSiteOptions(
          trackingLinks.map((link) => ({
            id: link.siteId,
            name: link.siteName,
            baseUrl: link.baseUrl,
          })),
        )
        setCodes(response.referralCodes)
        setTotal(response.pagination.total)
      } catch (loadError) {
        setError(parseApiError(loadError).message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [currentAffiliateId, page, siteFilter, statusFilter],
  )

  useEffect(() => {
    if (!authLoading && !isAffiliate(user?.role)) {
      router.push("/")
      return
    }

    if (authLoading || !user || fetchedRef.current) return
    fetchedRef.current = true
    void fetchCodes()
  }, [authLoading, user, router, fetchCodes])

  useEffect(() => {
    if (!fetchedRef.current) return
    void fetchCodes(true)
  }, [page, siteFilter, statusFilter, fetchCodes])

  const filteredCodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return codes

    return codes.filter((code) => {
      return (
        code.code.toLowerCase().includes(query) ||
        code.siteName.toLowerCase().includes(query) ||
        (code.label ?? "").toLowerCase().includes(query) ||
        (code.referralUrl ?? "").toLowerCase().includes(query)
      )
    })
  }, [codes, searchQuery])

  const validationMessage = validateReferralCode(formState.code)

  const handleCreate = useCallback(async () => {
    if (!currentAffiliateId || !formState.siteId) return
    if (validationMessage) {
      notifyError(validationMessage)
      return
    }

    setIsSubmitting(true)
    try {
      await referralCodesService.create({
        affiliateId: currentAffiliateId,
        siteId: Number(formState.siteId),
        code: formState.code.trim() || undefined,
      })

      success("Referral code created")
      setDialogOpen(false)
      setFormState(buildReferralCodeFormState(null))
      await fetchCodes(true)
    } catch (createError) {
      notifyError(parseApiError(createError).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentAffiliateId, fetchCodes, formState.code, formState.siteId, notifyError, success, validationMessage])

  const handleToggle = useCallback(
    async (id: number) => {
      try {
        const updated = await referralCodesService.toggle(id)
        setCodes((current) => current.map((code) => (code.id === id ? updated : code)))
        success(`Referral code ${updated.isActive ? "activated" : "deactivated"}`)
      } catch (toggleError) {
        notifyError(parseApiError(toggleError).message)
      }
    },
    [notifyError, success],
  )

  const codeColumns: Column<ReferralCode>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        cell: (code) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-sm">{code.code}</code>
              <CopyButton value={code.code} size="icon" className="size-8" />
            </div>
            {code.label ? <div className="text-xs text-muted-foreground">{code.label}</div> : null}
          </div>
        ),
      },
      {
        key: "referral-url",
        header: "Referral URL",
        cell: (code) =>
          code.referralUrl ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[240px] truncate text-sm text-muted-foreground">{code.referralUrl}</span>
              <CopyButton value={code.referralUrl} size="icon" className="size-8" />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Not available</span>
          ),
      },
      {
        key: "site",
        header: "Site",
        cell: (code) => (
          <div className="space-y-1">
            <div className="font-medium">{code.siteName}</div>
            {code.siteUrl ? <div className="text-xs text-muted-foreground">{code.siteUrl}</div> : null}
          </div>
        ),
      },
      {
        key: "clicks",
        header: "Clicks",
        className: "text-right",
        headerClassName: "text-right",
        cell: (code) => formatNumber(code.totalClicks ?? 0),
      },
      {
        key: "conversions",
        header: "Conversions",
        className: "text-right",
        headerClassName: "text-right",
        cell: (code) => formatNumber(code.totalConversions ?? 0),
      },
      {
        key: "status",
        header: "Status",
        cell: (code) => <StatusBadge status={getReferralCodeStatusLabel(code.isActive)} />,
      },
      {
        key: "created",
        header: "Created",
        cell: (code) => formatDate(code.createdAt),
      },
      {
        key: "actions",
        header: "",
        className: "w-12 text-right",
        cell: (code) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleToggle(code.id)}>
                <Power className="size-4" />
                {code.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleToggle],
  )

  if (authLoading) {
    return <ReferralCodesSkeleton />
  }

  if (!isAffiliate(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral codes"
        description="Create and manage affiliate tracking codes for your assigned sites."
        onRefresh={() => fetchCodes(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Create code
          </Button>
        }
      />

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Active referral codes</CardTitle>
            <CardDescription>Search, filter, copy, and toggle the codes attached to your sites.</CardDescription>
          </div>
          <FilterBar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search code, site, or URL..."
          >
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sites</SelectItem>
                {siteOptions.map((site) => (
                  <SelectItem key={site.id} value={String(site.id)}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="true">Active only</SelectItem>
                <SelectItem value="false">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </CardHeader>
        <CardContent className="space-y-4">
          <AsyncBoundary
            loading={false}
            error={error}
            loadingFallback={<ReferralCodesSkeleton />}
            onRetry={() => fetchCodes()}
          >
            <DataTable
              columns={codeColumns}
              data={filteredCodes}
              rowKey={(code) => code.id}
              loading={isLoading && codes.length === 0}
              emptyTitle="No referral codes found"
              emptyDescription="Create your first code or adjust the active filters."
              className="border-0"
            />
          </AsyncBoundary>

          {!searchQuery.trim() ? (
            <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          ) : null}
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create referral code"
        description="Create a new code for one of your assigned sites."
        onSubmit={handleCreate}
        submitLabel={isSubmitting ? "Creating..." : "Create code"}
        loading={isSubmitting}
        submitDisabled={!formState.siteId || Boolean(validationMessage)}
      >
        <div className="space-y-2">
          <Label htmlFor="siteId">Site</Label>
          <Select value={formState.siteId} onValueChange={(value) => setFormState((current) => ({ ...current, siteId: value }))}>
            <SelectTrigger id="siteId">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {siteOptions.map((site) => (
                <SelectItem key={site.id} value={String(site.id)}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Custom code (optional)</Label>
          <Input
            id="code"
            value={formState.code}
            onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value }))}
            placeholder="Leave blank to auto-generate"
          />
          {validationMessage ? <p className="text-sm text-destructive">{validationMessage}</p> : null}
        </div>
      </FormDialog>
    </div>
  )
}

function ReferralCodesSkeleton() {
  return <TableSkeleton rows={8} columns={7} />
}
