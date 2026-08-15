"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Power, Search, Trash2 } from "lucide-react"
import {
  ConfirmDialog,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { useAuth, isSuperAdmin } from "@/lib/auth-context"
import { sitesService, type Site, type SiteSearchResult } from "@/lib/api/sites"
import { parseApiError } from "@/lib/api/errors"
import { buildSiteFilters, getSiteStatusActionLabel, validateSiteForm } from "./sites-view-model"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const PAGE_SIZE = 20

export default function SitesPage() {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [sites, setSites] = useState<Site[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SiteSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingSite, setDeletingSite] = useState<Site | null>(null)

  const fetchSites = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const response = await sitesService.getAll(buildSiteFilters({ page, pageSize: PAGE_SIZE, status }))
        setSites(response.sites)
        setTotal(response.pagination?.total ?? response.total)
      } catch (loadError) {
        error(parseApiError(loadError).message || "Failed to load sites")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [error, page, status],
  )

  useEffect(() => {
    if (!isSuperAdmin(user?.role)) return

    if (!fetchedRef.current) {
      fetchedRef.current = true
      void fetchSites()
      return
    }

    void fetchSites(true)
  }, [fetchSites, user?.role])

  useEffect(() => {
    const trimmed = searchQuery.trim()

    if (!trimmed) {
      setSearchResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await sitesService.search({ q: trimmed, limit: 8 })
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const handleDelete = async () => {
    if (!deletingSite) return

    try {
      await sitesService.delete(deletingSite.id)
      success("Site deleted successfully")
      setDeletingSite(null)
      await fetchSites(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to delete site")
    }
  }

  const handleToggleStatus = async (site: Site) => {
    try {
      const updated = await sitesService.toggleStatus(site.id)
      setSites((current) => current.map((entry) => (entry.id === site.id ? updated : entry)))
      if (editingSite?.id === site.id) {
        setEditingSite(updated)
      }
      success(`Site ${updated.status === "active" ? "activated" : "deactivated"} successfully`)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update site status")
    }
  }

  const handleSave = async (site: Site) => {
    setEditingSite(null)
    setIsCreateOpen(false)

    if (page !== 1 && !editingSite) {
      setPage(1)
      return
    }

    await fetchSites(true)
  }

  const columns: Column<Site>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Site",
        cell: (site) => (
          <div className="space-y-1">
            <div className="font-medium">{site.name}</div>
            <div className="text-xs text-muted-foreground">{site.baseUrl}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (site) => <StatusBadge status={site.status} />,
      },
      {
        key: "keys",
        header: "Public key",
        cell: (site) => (
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-xs">{site.publicApiKey.slice(0, 14)}...</code>
            <CopyButton value={site.publicApiKey} size="icon" className="size-8" />
          </div>
        ),
      },
      {
        key: "signature",
        header: "Signature",
        cell: (site) => (
          <Badge variant={site.requireSignatureVerification ? "default" : "outline"}>
            {site.requireSignatureVerification ? "Required" : "Optional"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-12 text-right",
        cell: (site) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <SiteActions
              site={site}
              onEdit={() => setEditingSite(site)}
              onDelete={() => setDeletingSite(site)}
              onToggle={() => handleToggleStatus(site)}
            />
          </div>
        ),
      },
    ],
    [handleToggleStatus],
  )

  if (!isSuperAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sites"
        description="Manage tracked websites, API keys, and signature verification."
        onRefresh={() => fetchSites(true)}
        isRefreshing={isRefreshing}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            Add site
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterBar search={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search sites by name">
          <Select
            value={status}
            onValueChange={(value: "all" | "active" | "inactive") => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {searchQuery.trim() && (
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 text-sm font-medium">Search results</div>
            <div className="divide-y">
              {isSearching ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">Searching sites...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">No matching sites found.</div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/40"
                    onClick={() => {
                      window.location.href = `/admin/sites/${result.id}`
                    }}
                  >
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-xs text-muted-foreground">{result.baseUrl}</div>
                    </div>
                    <StatusBadge status={result.status} />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {isLoading && sites.length === 0 ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={sites}
              rowKey={(site) => site.id}
              onRowClick={(site) => {
                window.location.href = `/admin/sites/${site.id}`
              }}
              emptyTitle="No sites found"
              emptyDescription="Create a site to start tracking affiliate traffic."
            />
            <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      <SiteFormDialog
        open={isCreateOpen || !!editingSite}
        site={editingSite}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingSite(null)
          }
        }}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deletingSite}
        onOpenChange={(open) => !open && setDeletingSite(null)}
        title="Delete site?"
        description={
          deletingSite ? `This will permanently delete "${deletingSite.name}".` : undefined
        }
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

function SiteActions({
  site,
  onEdit,
  onDelete,
  onToggle,
}: {
  site: Site
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open site actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle}>
          <Power className="size-4" />
          {getSiteStatusActionLabel(site.status)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SiteFormDialog({
  open,
  onOpenChange,
  site,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: Site | null
  onSave: (site: Site) => Promise<void>
}) {
  const isEditing = Boolean(site)
  const { success, error } = useNotification()

  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [description, setDescription] = useState("")
  const [requireSignatureVerification, setRequireSignatureVerification] = useState(true)
  const [showPublicKey, setShowPublicKey] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [currentSite, setCurrentSite] = useState<Site | null>(site)
  const [errors, setErrors] = useState<{ name?: string; baseUrl?: string }>({})

  useEffect(() => {
    if (!open) return

    setCurrentSite(site)
    setName(site?.name ?? "")
    setBaseUrl(site?.baseUrl ?? "")
    setDescription(site?.description ?? "")
    setRequireSignatureVerification(site?.requireSignatureVerification ?? true)
    setShowPublicKey(false)
    setShowPrivateKey(false)
    setErrors({})
  }, [open, site])

  const handleSubmit = async () => {
    const validationErrors = validateSiteForm({ name, baseUrl })
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        description: description.trim(),
        requireSignatureVerification,
      }

      const saved = currentSite
        ? await sitesService.update(currentSite.id, payload)
        : await sitesService.create(payload)

      success(currentSite ? "Site updated successfully" : "Site created successfully")
      await onSave(saved)
      onOpenChange(false)
    } catch (submitError: any) {
      error(submitError?.message || (currentSite ? "Failed to update site" : "Failed to create site"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegenerateKeys = async () => {
    if (!currentSite) return

    setIsRegenerating(true)

    try {
      const keys = await sitesService.regenerateKeys(currentSite.id)
      const updated = { ...currentSite, ...keys }
      setCurrentSite(updated)
      success("API keys regenerated successfully")
      await onSave(updated)
      setIsRegenerateOpen(false)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to regenerate API keys")
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={currentSite ? "Edit site" : "Add site"}
        description="Create or update a tracked site configuration."
        onSubmit={handleSubmit}
        submitLabel={currentSite ? "Save changes" : "Create site"}
        loading={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="site-name">Site name</Label>
          <Input
            id="site-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example product"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-url">Base URL</Label>
          <Input
            id="site-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://example.com"
          />
          {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-description">Description</Label>
          <Textarea
            id="site-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional internal note about this site"
          />
        </div>

        {currentSite && (
          <>
            <div className="space-y-2">
              <Label>Public API key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input readOnly value={currentSite.publicApiKey} type={showPublicKey ? "text" : "password"} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                    onClick={() => setShowPublicKey((value) => !value)}
                  >
                    {showPublicKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                <CopyButton value={currentSite.publicApiKey} label="Copy" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Private API key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input readOnly value={currentSite.privateApiKey} type={showPrivateKey ? "text" : "password"} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                    onClick={() => setShowPrivateKey((value) => !value)}
                  >
                    {showPrivateKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                <CopyButton value={currentSite.privateApiKey} label="Copy" />
              </div>
            </div>

            <Button type="button" variant="outline" onClick={() => setIsRegenerateOpen(true)}>
              Regenerate API keys
            </Button>
          </>
        )}

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <div className="text-sm font-medium">Require signature verification</div>
            <div className="text-xs text-muted-foreground">Validate incoming webhook signatures.</div>
          </div>
          <Switch checked={requireSignatureVerification} onCheckedChange={setRequireSignatureVerification} />
        </div>
      </FormDialog>

      <AlertDialog open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API keys?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing integrations will stop working immediately after new keys are issued.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => {
              event.preventDefault()
              void handleRegenerateKeys()
            }} disabled={isRegenerating}>
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
