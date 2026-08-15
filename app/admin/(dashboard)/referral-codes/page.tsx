"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { MoreHorizontal, Pencil, Plus, Power, RefreshCw } from "lucide-react"
import {
  AsyncBoundary,
  CopyButton,
  DataTable,
  DataTablePagination,
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
import { DateRangePicker } from "@/components/ui/date-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNotification } from "@/components/ui/notification"
import { SearchDropdown, type SearchDropdownOption } from "@/components/ui/search-dropdown"
import { affiliatesService, referralCodesService, sitesService, type ReferralCode } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { isAdmin, useAuth } from "@/lib/auth-context"
import { formatDate, formatNumber } from "@/lib/utils"
import { useFilterState } from "@/hooks/use-filter-state"
import { mapAffiliateToOption, mapSiteToOption } from "@/lib/utils/search-mapping"
import { validateReferralCode } from "@/lib/utils/referral-code"
import {
  buildAdminReferralCodeFilters,
  buildAdminReferralCodeFormState,
  buildReferralCodeSummary,
} from "./referral-codes-view-model"

const INITIAL_FILTERS = {
  affiliate: "all",
  site: "all",
  status: "all",
  startDate: "",
  endDate: "",
  page: 1,
  pageSize: 20,
}

type CreateFormState = {
  affiliateId: string
  siteId: string
  code: string
}

export default function ReferralCodesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { success, error: notifyError } = useNotification()
  const { filters, setFilter, setFilters } = useFilterState(INITIAL_FILTERS)
  const lastFetchKeyRef = useRef("")

  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [affiliateOptions, setAffiliateOptions] = useState<SearchDropdownOption[]>([])
  const [siteOptions, setSiteOptions] = useState<SearchDropdownOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editCode, setEditCode] = useState<ReferralCode | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>({
    affiliateId: "",
    siteId: "",
    code: "",
  })
  const [editLabel, setEditLabel] = useState("")

  const fetchCodes = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const response = await referralCodesService.getAll(buildAdminReferralCodeFilters(filters))
        setCodes(response.referralCodes)
        setTotal(response.pagination.total)
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
    if (filters.affiliate === "all") return

    affiliatesService
      .getById(Number(filters.affiliate))
      .then((affiliate) => {
        if (!affiliate) return
        setAffiliateOptions((current) => {
          if (current.some((option) => option.value === String(affiliate.id))) return current
          return [...current, mapAffiliateToOption(affiliate)]
        })
      })
      .catch(() => undefined)
  }, [filters.affiliate])

  useEffect(() => {
    if (filters.site === "all") return

    sitesService
      .getById(Number(filters.site))
      .then((site) => {
        if (!site) return
        setSiteOptions((current) => {
          if (current.some((option) => option.value === String(site.id))) return current
          return [...current, mapSiteToOption(site as never)]
        })
      })
      .catch(() => undefined)
  }, [filters.site])

  useEffect(() => {
    if (authLoading || !isAdmin(user?.role)) return

    const fetchKey = JSON.stringify(buildAdminReferralCodeFilters(filters))
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey
    void fetchCodes()
  }, [authLoading, fetchCodes, filters, user?.role])

  useEffect(() => {
    if (!editCode) return
    setEditLabel(editCode.label || "")
  }, [editCode])

  const handleAffiliateSearch = async (query: string) => {
    try {
      const results = await affiliatesService.search({ q: query, status: "approved" })
      setAffiliateOptions(results.map(mapAffiliateToOption))
    } catch {
      setAffiliateOptions([])
    }
  }

  const handleSiteSearch = async (query: string) => {
    try {
      const results = await sitesService.search({ q: query })
      setSiteOptions(results.map(mapSiteToOption))
    } catch {
      setSiteOptions([])
    }
  }

  const filteredCodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return codes

    return codes.filter((code) =>
      [
        code.code,
        code.label,
        code.affiliateName,
        code.affiliateEmail,
        code.siteName,
        code.siteUrl,
        code.referralUrl,
      ].some((value) => value?.toLowerCase().includes(query)),
    )
  }, [codes, searchQuery])

  const summary = useMemo(() => buildReferralCodeSummary(filteredCodes), [filteredCodes])
  const createCodeError = validateReferralCode(createForm.code)

  const handleCreate = async () => {
    if (!createForm.affiliateId || !createForm.siteId || createCodeError) return

    setIsSubmitting(true)
    try {
      await referralCodesService.create({
        affiliateId: Number(createForm.affiliateId),
        siteId: Number(createForm.siteId),
        code: createForm.code.trim() || undefined,
      })
      success("Referral code created")
      setCreateDialogOpen(false)
      setCreateForm(buildAdminReferralCodeFormState())
      await fetchCodes(true)
    } catch (createError) {
      notifyError(parseApiError(createError).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (id: number) => {
    try {
      const updated = await referralCodesService.toggle(id)
      setCodes((current) => current.map((code) => (code.id === id ? updated : code)))
      success(`Referral code ${updated.isActive ? "activated" : "deactivated"}`)
    } catch (toggleError) {
      notifyError(parseApiError(toggleError).message)
    }
  }

  const handleRegenerate = async (id: number) => {
    try {
      const updated = await referralCodesService.regenerate(id)
      setCodes((current) => current.map((code) => (code.id === id ? updated : code)))
      success("Referral code regenerated")
    } catch (regenerateError) {
      notifyError(parseApiError(regenerateError).message)
    }
  }

  const handleUpdateLabel = async () => {
    if (!editCode) return

    setIsSubmitting(true)
    try {
      const updated = await referralCodesService.update(editCode.id, { label: editLabel.trim() })
      setCodes((current) => current.map((code) => (code.id === editCode.id ? updated : code)))
      setEditCode(null)
      success("Referral code tag updated")
    } catch (updateError) {
      notifyError(parseApiError(updateError).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: Column<ReferralCode>[] = useMemo(
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
            <div className="text-xs text-muted-foreground">{code.label || "No tag"}</div>
          </div>
        ),
      },
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (code) => (
          <div className="space-y-1">
            <div className="font-medium">{code.affiliateName || `Affiliate #${code.affiliateId}`}</div>
            <div className="text-xs text-muted-foreground">{code.affiliateEmail || "No email"}</div>
          </div>
        ),
      },
      {
        key: "site",
        header: "Site",
        cell: (code) => (
          <div className="space-y-1">
            <div className="font-medium">{code.siteName}</div>
            <div className="text-xs text-muted-foreground">{code.siteUrl || "No URL"}</div>
          </div>
        ),
      },
      {
        key: "stats",
        header: "Performance",
        cell: (code) => (
          <div className="space-y-1">
            <div>{formatNumber(code.totalClicks ?? 0)} clicks</div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(code.totalConversions ?? 0)} conversions
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (code) => <StatusBadge status={code.isActive ? "active" : "inactive"} />,
      },
      {
        key: "created",
        header: "Created",
        cell: (code) => formatDate(code.createdAt),
      },
      {
        key: "actions",
        header: "",
        className: "w-[72px] text-right",
        cell: (code) => (
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Open referral code actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditCode(code)}>
                  <Pencil className="size-4" />
                  Edit tag
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRegenerate(code.id)}>
                  <RefreshCw className="size-4" />
                  Regenerate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggle(code.id)}>
                  <Power className="size-4" />
                  {code.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleRegenerate, handleToggle],
  )

  if (authLoading) {
    return <ReferralCodesLoadingState />
  }

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Codes"
        description="Manage affiliate tracking codes, site links, and code health."
        onRefresh={() => fetchCodes(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" />
            Create code
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Visible Codes" value={summary.total} loading={isLoading && !codes.length} />
        <StatCard label="Active" value={summary.active} loading={isLoading && !codes.length} />
        <StatCard label="Inactive" value={summary.inactive} loading={isLoading && !codes.length} />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base font-semibold">Code Directory</CardTitle>
          <FilterBar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search code, affiliate, site, or URL..."
          >
            <SearchDropdown
              value={filters.affiliate}
              onChange={(value) => setFilter("affiliate", value)}
              options={affiliateOptions}
              onSearch={handleAffiliateSearch}
              placeholder="Affiliate"
              allowClear
            />
            <SearchDropdown
              value={filters.site}
              onChange={(value) => setFilter("site", value)}
              options={siteOptions}
              onSearch={handleSiteSearch}
              placeholder="Site"
              allowClear
            />
            <SearchDropdown
              value={filters.status}
              onChange={(value) => setFilter("status", value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "true", label: "Active only" },
                { value: "false", label: "Inactive only" },
              ]}
              placeholder="Status"
              allowClear
            />
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range)
                setFilters({
                  startDate: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  endDate: range?.from ? format(range.to ?? range.from, "yyyy-MM-dd") : "",
                  page: 1,
                })
              }}
              placeholder="Date range"
              className="w-full sm:w-[240px]"
            />
          </FilterBar>
        </CardHeader>
        <CardContent className="space-y-4">
          <AsyncBoundary
            loading={isLoading}
            error={error}
            isEmpty={!filteredCodes.length}
            loadingFallback={<TableSkeleton rows={8} columns={7} />}
            onRetry={() => fetchCodes()}
            emptyTitle="No referral codes found"
            emptyDescription="Try different filters or create a new referral code."
          >
            <>
              <DataTable
                columns={columns}
                data={filteredCodes}
                rowKey={(code) => code.id}
              />
              <DataTablePagination
                page={filters.page}
                pageSize={filters.pageSize}
                total={searchQuery.trim() ? filteredCodes.length : total}
                onPageChange={(page) => setFilter("page", page)}
                className="pt-2"
              />
            </>
          </AsyncBoundary>
        </CardContent>
      </Card>

      <FormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Create referral code"
        description="Assign a new code to an affiliate and site. Leave code blank to auto-generate."
        submitLabel={isSubmitting ? "Creating..." : "Create code"}
        loading={isSubmitting}
        submitDisabled={!createForm.affiliateId || !createForm.siteId || Boolean(createCodeError)}
        onSubmit={() => {
          void handleCreate()
        }}
      >
        <div className="space-y-2">
          <Label>Affiliate</Label>
          <SearchDropdown
            value={createForm.affiliateId}
            onChange={(value) => setCreateForm((current) => ({ ...current, affiliateId: value }))}
            options={affiliateOptions}
            onSearch={handleAffiliateSearch}
            placeholder="Search affiliate..."
          />
        </div>
        <div className="space-y-2">
          <Label>Site</Label>
          <SearchDropdown
            value={createForm.siteId}
            onChange={(value) => setCreateForm((current) => ({ ...current, siteId: value }))}
            options={siteOptions}
            onSearch={handleSiteSearch}
            placeholder="Search site..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referral-code">Code (optional)</Label>
          <Input
            id="referral-code"
            value={createForm.code}
            onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))}
            placeholder="Leave blank to auto-generate"
          />
          <p className="text-xs text-muted-foreground">
            {createCodeError || "Allowed characters: letters, numbers, hyphens, and underscores."}
          </p>
        </div>
      </FormDialog>

      <FormDialog
        open={!!editCode}
        onOpenChange={(open) => {
          if (!open) setEditCode(null)
        }}
        title={editCode ? `Edit tag for ${editCode.code}` : "Edit tag"}
        description="Update the label used to identify this referral code internally."
        submitLabel={isSubmitting ? "Saving..." : "Save tag"}
        loading={isSubmitting}
        onSubmit={() => {
          void handleUpdateLabel()
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="referral-tag">Tag</Label>
          <Input
            id="referral-tag"
            value={editLabel}
            onChange={(event) => setEditLabel(event.target.value)}
            placeholder="Homepage CTA, creator campaign, newsletter footer..."
          />
        </div>
      </FormDialog>
    </div>
  )
}

function ReferralCodesLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Visible Codes" value="" loading />
        <StatCard label="Active" value="" loading />
        <StatCard label="Inactive" value="" loading />
      </div>
      <TableSkeleton rows={8} columns={7} />
    </div>
  )
}
