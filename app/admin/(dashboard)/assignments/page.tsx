"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Plus, Power, Trash2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotification } from "@/components/ui/notification"
import { useAuth, isAdmin } from "@/lib/auth-context"
import {
  assignmentsService,
  affiliatesService,
  plansService,
  sitesService,
  type Affiliate,
  type PlanAssignment,
  type SiteAssignment,
  type Site,
} from "@/lib/api"
import type { Plan } from "@/lib/api/plans"
import { formatPercent } from "@/lib/utils"
import {
  buildAssignmentFilters,
  formatAssignmentDuration,
  fromStoredCommissionPercentage,
  toStoredCommissionPercentage,
} from "./assignments-view-model"

const PAGE_SIZE = 20

type PlanAssignmentFormState = {
  affiliateId: string
  planId: string
  customCommission: string
  customDurationType: string
  customDurationMonths: string
}

type SiteAssignmentFormState = {
  affiliateId: string
  siteId: string
}

const INITIAL_PLAN_FORM: PlanAssignmentFormState = {
  affiliateId: "",
  planId: "",
  customCommission: "",
  customDurationType: "default",
  customDurationMonths: "",
}

const INITIAL_SITE_FORM: SiteAssignmentFormState = {
  affiliateId: "",
  siteId: "",
}

export default function AssignmentsPage() {
  const { user } = useAuth()

  if (!isAdmin(user?.role)) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Manage plan and site relationships for approved affiliates."
      />

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plan assignments</TabsTrigger>
          <TabsTrigger value="sites">Site assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="space-y-6">
          <PlanAssignmentsSection />
        </TabsContent>
        <TabsContent value="sites" className="space-y-6">
          <SiteAssignmentsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PlanAssignmentsSection() {
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [assignments, setAssignments] = useState<PlanAssignment[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ affiliateId: "all", relatedId: "all", active: "all" })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<PlanAssignment | null>(null)
  const [deletingAssignment, setDeletingAssignment] = useState<PlanAssignment | null>(null)
  const [form, setForm] = useState<PlanAssignmentFormState>(INITIAL_PLAN_FORM)

  const fetchDependencies = useCallback(async () => {
    const [affiliatesResponse, plansResponse] = await Promise.all([
      affiliatesService.getAll({ limit: 100, status: "approved" }),
      plansService.getAll({ limit: 100 }),
    ])
    setAffiliates(affiliatesResponse.affiliates)
    setPlans(plansResponse.plans)
  }, [])

  const fetchAssignments = useCallback(
    async (nextPage = page, silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const builtFilters = buildAssignmentFilters(filters)
        const response = await assignmentsService.getPlanAssignments({
          page: nextPage,
          limit: PAGE_SIZE,
          affiliateId: builtFilters.affiliateId,
          planId: builtFilters.relatedId,
          isActive: builtFilters.isActive,
        })
        setAssignments(response.assignments)
        setTotal(response.pagination.total)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load plan assignments")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [error, filters, page],
  )

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    void (async () => {
      try {
        await fetchDependencies()
        await fetchAssignments(1)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load assignment dependencies")
        setIsLoading(false)
      }
    })()
  }, [error, fetchAssignments, fetchDependencies])

  const summary = useMemo(() => {
    const active = assignments.filter((assignment) => assignment.isActive).length
    const overrides = assignments.filter((assignment) => assignment.customCommissionOverride || assignment.customDurationOverride).length
    return {
      total: assignments.length,
      active,
      inactive: assignments.length - active,
      overrides,
    }
  }, [assignments])

  const openCreate = () => {
    setForm(INITIAL_PLAN_FORM)
    setIsCreateOpen(true)
  }

  const openEdit = (assignment: PlanAssignment) => {
    setEditingAssignment(assignment)
    setForm({
      affiliateId: `${assignment.affiliateId}`,
      planId: `${assignment.planId}`,
      customCommission: fromStoredCommissionPercentage(assignment.customCommissionOverride),
      customDurationType: assignment.customDurationOverride ?? "default",
      customDurationMonths: assignment.customDurationMonths ? `${assignment.customDurationMonths}` : "",
    })
  }

  const handleCreate = async () => {
    if (!form.affiliateId || !form.planId) {
      error("Select an affiliate and a plan")
      return
    }

    setIsSaving(true)
    try {
      await assignmentsService.createPlanAssignment({
        affiliateId: Number(form.affiliateId),
        planId: Number(form.planId),
        customCommissionOverride: form.customCommission ? toStoredCommissionPercentage(form.customCommission) : undefined,
        customDurationOverride: form.customDurationType !== "default" ? (form.customDurationType as any) : undefined,
        customDurationMonths: form.customDurationType === "x_months" && form.customDurationMonths ? Number(form.customDurationMonths) : undefined,
      })
      success("Plan assignment created")
      setIsCreateOpen(false)
      await fetchAssignments(page, true)
    } catch (saveError: any) {
      error(saveError?.message || "Failed to create plan assignment")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingAssignment) return

    setIsSaving(true)
    try {
      await assignmentsService.updatePlanAssignment(editingAssignment.id, {
        customCommissionOverride: form.customCommission ? toStoredCommissionPercentage(form.customCommission) : undefined,
        customDurationOverride: form.customDurationType !== "default" ? (form.customDurationType as any) : undefined,
        customDurationMonths: form.customDurationType === "x_months" && form.customDurationMonths ? Number(form.customDurationMonths) : undefined,
      })
      success("Plan assignment updated")
      setEditingAssignment(null)
      await fetchAssignments(page, true)
    } catch (saveError: any) {
      error(saveError?.message || "Failed to update assignment")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (assignment: PlanAssignment) => {
    try {
      await assignmentsService.togglePlanAssignment(assignment.id)
      success(`Assignment ${assignment.isActive ? "deactivated" : "activated"}`)
      await fetchAssignments(page, true)
    } catch (toggleError: any) {
      error(toggleError?.message || "Failed to update assignment")
    }
  }

  const handleDelete = async () => {
    if (!deletingAssignment) return

    setIsDeleting(true)
    try {
      await assignmentsService.deletePlanAssignment(deletingAssignment.affiliateId, deletingAssignment.planId)
      success("Assignment deleted")
      setDeletingAssignment(null)
      await fetchAssignments(page, true)
    } catch (deleteError: any) {
      error(deleteError?.message || "Failed to delete assignment")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<PlanAssignment>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (assignment) => assignment.affiliateName,
      },
      {
        key: "plan",
        header: "Plan",
        cell: (assignment) => assignment.planName,
      },
      {
        key: "commission",
        header: "Commission override",
        cell: (assignment) => assignment.customCommissionOverride ? formatPercent(assignment.customCommissionOverride, 1) : "Plan default",
      },
      {
        key: "duration",
        header: "Duration override",
        cell: (assignment) => formatAssignmentDuration(assignment.customDurationOverride, assignment.customDurationMonths),
      },
      {
        key: "status",
        header: "Status",
        cell: (assignment) => (
          <Badge variant={assignment.isActive ? "default" : "secondary"}>
            {assignment.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-[220px]",
        cell: (assignment) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => openEdit(assignment)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleToggle(assignment)}>
              <Power className="size-4" />
              {assignment.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeletingAssignment(assignment)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assignments" value={summary.total} />
        <StatCard label="Active" value={summary.active} />
        <StatCard label="Inactive" value={summary.inactive} />
        <StatCard label="With overrides" value={summary.overrides} />
      </div>

      <FilterBar search="" onSearchChange={() => {}} searchPlaceholder="Filters are on the right">
        <Select value={filters.affiliateId} onValueChange={(value) => setFilters((current) => ({ ...current, affiliateId: value }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All affiliates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All affiliates</SelectItem>
            {affiliates.map((affiliate) => (
              <SelectItem key={affiliate.id} value={`${affiliate.id}`}>{affiliate.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.relatedId} onValueChange={(value) => setFilters((current) => ({ ...current, relatedId: value }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={`${plan.id}`}>{plan.planName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.active} onValueChange={(value) => setFilters((current) => ({ ...current, active: value }))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setPage(1)
            void fetchAssignments(1)
          }}
        >
          Apply
        </Button>
        <Button variant="outline" onClick={() => openCreate()}>
          <Plus className="size-4" />
          Assign plan
        </Button>
      </FilterBar>

      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No plan assignments found"
          description="Assign a commission plan to an approved affiliate."
          action={<Button onClick={openCreate}>Assign plan</Button>}
        />
      ) : (
        <>
          <DataTable columns={columns} data={assignments} rowKey={(assignment) => assignment.id} />
          <DataTablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(nextPage) => {
              setPage(nextPage)
              void fetchAssignments(nextPage)
            }}
          />
        </>
      )}

      <FormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Assign plan"
        description="Pick an approved affiliate and an active commission plan."
        onSubmit={handleCreate}
        submitLabel="Create assignment"
        loading={isSaving}
      >
        <PlanAssignmentFields affiliates={affiliates} plans={plans} form={form} setForm={setForm} isEditing={false} />
      </FormDialog>

      <FormDialog
        open={!!editingAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAssignment(null)
          }
        }}
        title="Edit plan assignment"
        description={`Adjust overrides for ${editingAssignment?.affiliateName ?? "this assignment"}.`}
        onSubmit={handleUpdate}
        submitLabel="Save changes"
        loading={isSaving}
      >
        <PlanAssignmentFields affiliates={affiliates} plans={plans} form={form} setForm={setForm} isEditing />
      </FormDialog>

      <ConfirmDialog
        open={!!deletingAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingAssignment(null)
          }
        }}
        title="Delete assignment?"
        description={`Remove ${deletingAssignment?.planName ?? "this plan"} from ${deletingAssignment?.affiliateName ?? "this affiliate"}.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  )
}

function SiteAssignmentsSection() {
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [assignments, setAssignments] = useState<SiteAssignment[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ affiliateId: "all", relatedId: "all", active: "all" })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingAssignment, setDeletingAssignment] = useState<SiteAssignment | null>(null)
  const [form, setForm] = useState<SiteAssignmentFormState>(INITIAL_SITE_FORM)

  const fetchDependencies = useCallback(async () => {
    const [affiliatesResponse, sitesResponse] = await Promise.all([
      affiliatesService.getAll({ limit: 100, status: "approved" }),
      sitesService.getAll({ limit: 100 }),
    ])
    setAffiliates(affiliatesResponse.affiliates)
    setSites(sitesResponse.sites)
  }, [])

  const fetchAssignments = useCallback(
    async (nextPage = page, silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const builtFilters = buildAssignmentFilters(filters)
        const response = await assignmentsService.getSiteAssignments({
          page: nextPage,
          limit: PAGE_SIZE,
          affiliateId: builtFilters.affiliateId,
          siteId: builtFilters.relatedId,
          isActive: builtFilters.isActive,
        })
        setAssignments(response.assignments)
        setTotal(response.pagination.total)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load site assignments")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [error, filters, page],
  )

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    void (async () => {
      try {
        await fetchDependencies()
        await fetchAssignments(1)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load assignment dependencies")
        setIsLoading(false)
      }
    })()
  }, [error, fetchAssignments, fetchDependencies])

  const summary = useMemo(() => {
    const active = assignments.filter((assignment) => assignment.isActive).length
    return {
      total: assignments.length,
      active,
      inactive: assignments.length - active,
    }
  }, [assignments])

  const handleCreate = async () => {
    if (!form.affiliateId || !form.siteId) {
      error("Select an affiliate and a site")
      return
    }

    setIsSaving(true)
    try {
      await assignmentsService.createSiteAssignment({
        affiliateId: Number(form.affiliateId),
        siteId: Number(form.siteId),
      })
      success("Site assignment created")
      setIsCreateOpen(false)
      setForm(INITIAL_SITE_FORM)
      await fetchAssignments(page, true)
    } catch (saveError: any) {
      error(saveError?.message || "Failed to create site assignment")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (assignment: SiteAssignment) => {
    try {
      await assignmentsService.toggleSiteAssignment(assignment.id)
      success(`Assignment ${assignment.isActive ? "deactivated" : "activated"}`)
      await fetchAssignments(page, true)
    } catch (toggleError: any) {
      error(toggleError?.message || "Failed to update assignment")
    }
  }

  const handleDelete = async () => {
    if (!deletingAssignment) return

    setIsDeleting(true)
    try {
      await assignmentsService.deleteSiteAssignment(deletingAssignment.affiliateId, deletingAssignment.siteId)
      success("Assignment deleted")
      setDeletingAssignment(null)
      await fetchAssignments(page, true)
    } catch (deleteError: any) {
      error(deleteError?.message || "Failed to delete assignment")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<SiteAssignment>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (assignment) => assignment.affiliateName,
      },
      {
        key: "site",
        header: "Site",
        cell: (assignment) => assignment.siteName,
      },
      {
        key: "created",
        header: "Created",
        cell: (assignment) => new Date(assignment.createdAt).toLocaleDateString("en-GB"),
      },
      {
        key: "status",
        header: "Status",
        cell: (assignment) => (
          <Badge variant={assignment.isActive ? "default" : "secondary"}>
            {assignment.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-[180px]",
        cell: (assignment) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => handleToggle(assignment)}>
              <Power className="size-4" />
              {assignment.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeletingAssignment(assignment)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assignments" value={summary.total} />
        <StatCard label="Active" value={summary.active} />
        <StatCard label="Inactive" value={summary.inactive} />
      </div>

      <FilterBar search="" onSearchChange={() => {}} searchPlaceholder="Filters are on the right">
        <Select value={filters.affiliateId} onValueChange={(value) => setFilters((current) => ({ ...current, affiliateId: value }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All affiliates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All affiliates</SelectItem>
            {affiliates.map((affiliate) => (
              <SelectItem key={affiliate.id} value={`${affiliate.id}`}>{affiliate.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.relatedId} onValueChange={(value) => setFilters((current) => ({ ...current, relatedId: value }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={`${site.id}`}>{site.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.active} onValueChange={(value) => setFilters((current) => ({ ...current, active: value }))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setPage(1)
            void fetchAssignments(1)
          }}
        >
          Apply
        </Button>
        <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4" />
          Assign site
        </Button>
      </FilterBar>

      {isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No site assignments found"
          description="Assign an active site to an approved affiliate."
          action={<Button onClick={() => setIsCreateOpen(true)}>Assign site</Button>}
        />
      ) : (
        <>
          <DataTable columns={columns} data={assignments} rowKey={(assignment) => assignment.id} />
          <DataTablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(nextPage) => {
              setPage(nextPage)
              void fetchAssignments(nextPage)
            }}
          />
        </>
      )}

      <FormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Assign site"
        description="Pick an approved affiliate and an active site."
        onSubmit={handleCreate}
        submitLabel="Create assignment"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="site-affiliate-id">Affiliate</Label>
          <Select value={form.affiliateId} onValueChange={(value) => setForm((current) => ({ ...current, affiliateId: value }))}>
            <SelectTrigger id="site-affiliate-id">
              <SelectValue placeholder="Select affiliate" />
            </SelectTrigger>
            <SelectContent>
              {affiliates.map((affiliate) => (
                <SelectItem key={affiliate.id} value={`${affiliate.id}`}>{affiliate.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-id">Site</Label>
          <Select value={form.siteId} onValueChange={(value) => setForm((current) => ({ ...current, siteId: value }))}>
            <SelectTrigger id="site-id">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.filter((site) => site.status === "active").map((site) => (
                <SelectItem key={site.id} value={`${site.id}`}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deletingAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingAssignment(null)
          }
        }}
        title="Delete assignment?"
        description={`Remove ${deletingAssignment?.siteName ?? "this site"} from ${deletingAssignment?.affiliateName ?? "this affiliate"}.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  )
}

function PlanAssignmentFields({
  affiliates,
  plans,
  form,
  setForm,
  isEditing,
}: {
  affiliates: Affiliate[]
  plans: Plan[]
  form: PlanAssignmentFormState
  setForm: React.Dispatch<React.SetStateAction<PlanAssignmentFormState>>
  isEditing: boolean
}) {
  return (
    <>
      {!isEditing ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="assignment-affiliate-id">Affiliate</Label>
            <Select value={form.affiliateId} onValueChange={(value) => setForm((current) => ({ ...current, affiliateId: value }))}>
              <SelectTrigger id="assignment-affiliate-id">
                <SelectValue placeholder="Select affiliate" />
              </SelectTrigger>
              <SelectContent>
                {affiliates.map((affiliate) => (
                  <SelectItem key={affiliate.id} value={`${affiliate.id}`}>{affiliate.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignment-plan-id">Plan</Label>
            <Select value={form.planId} onValueChange={(value) => setForm((current) => ({ ...current, planId: value }))}>
              <SelectTrigger id="assignment-plan-id">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.filter((plan) => plan.isActive).map((plan) => (
                  <SelectItem key={plan.id} value={`${plan.id}`}>{plan.planName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="assignment-commission">Custom commission percentage</Label>
        <Input
          id="assignment-commission"
          type="number"
          min="0.01"
          max="100"
          step="0.01"
          value={form.customCommission}
          onChange={(event) => setForm((current) => ({ ...current, customCommission: event.target.value }))}
          placeholder="Leave blank to use the plan default"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignment-duration-type">Custom duration</Label>
        <Select value={form.customDurationType} onValueChange={(value) => setForm((current) => ({ ...current, customDurationType: value }))}>
          <SelectTrigger id="assignment-duration-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Plan default</SelectItem>
            <SelectItem value="one_month">One month</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
            <SelectItem value="x_months">Custom months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.customDurationType === "x_months" ? (
        <div className="space-y-2">
          <Label htmlFor="assignment-duration-months">Duration months</Label>
          <Input
            id="assignment-duration-months"
            type="number"
            min="1"
            value={form.customDurationMonths}
            onChange={(event) => setForm((current) => ({ ...current, customDurationMonths: event.target.value }))}
          />
        </div>
      ) : null}
    </>
  )
}
