"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Pencil, Plus, Power, Star, Trash2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { useAuth, isAdmin } from "@/lib/auth-context"
import {
  plansService,
  type CreatePlanRequest,
  type Plan,
  type UpdatePlanRequest,
} from "@/lib/api/plans"
import { formatPercent } from "@/lib/utils"
import { formatPlanDurationLabel, validatePlanForm } from "./plans-view-model"

const PAGE_SIZE = 20

type PlanFormState = {
  planName: string
  baseCommissionPercentage: string
  commissionDurationType: CreatePlanRequest["commission_duration_type"]
  durationMonths: string
  description: string
  isActive: boolean
}

const INITIAL_FORM: PlanFormState = {
  planName: "",
  baseCommissionPercentage: "",
  commissionDurationType: "one_month",
  durationMonths: "",
  description: "",
  isActive: true,
}

export default function PlansPage() {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const fetchedRef = useRef(false)

  const [plans, setPlans] = useState<Plan[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState<PlanFormState>(INITIAL_FORM)

  const fetchPlans = useCallback(
    async (nextPage = page, silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const response = await plansService.getAll({ page: nextPage, limit: PAGE_SIZE })
        setPlans(response.plans)
        setTotal(response.pagination?.total ?? response.plans.length)
      } catch (loadError: any) {
        error(loadError?.message || "Failed to load plans")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [error, page],
  )

  useEffect(() => {
    if (fetchedRef.current || !isAdmin(user?.role)) return
    fetchedRef.current = true
    void fetchPlans(1)
  }, [fetchPlans, user?.role])

  const filteredPlans = useMemo(() => {
    const trimmed = query.trim().toLowerCase()

    if (!trimmed) {
      return plans
    }

    return plans.filter((plan) => {
      return (
        plan.planName.toLowerCase().includes(trimmed) ||
        (plan.description ?? "").toLowerCase().includes(trimmed)
      )
    })
  }, [plans, query])

  const summary = useMemo(() => {
    const active = plans.filter((plan) => plan.isActive).length
    const defaults = plans.filter((plan) => plan.isDefault).length

    return {
      total: plans.length,
      active,
      inactive: plans.length - active,
      defaults,
    }
  }, [plans])

  const openCreate = () => {
    setEditingPlan(null)
    setForm(INITIAL_FORM)
    setIsDialogOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setForm({
      planName: plan.planName,
      baseCommissionPercentage: `${Number(plan.baseCommissionPercentage) / 100}`,
      commissionDurationType: plan.commissionDurationType,
      durationMonths: plan.durationMonths ? `${plan.durationMonths}` : "",
      description: plan.description ?? "",
      isActive: plan.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const validationErrors = validatePlanForm(form)
    if (Object.keys(validationErrors).length > 0) {
      error(Object.values(validationErrors)[0] ?? "Invalid plan details")
      return
    }

    setIsSaving(true)

    const payload: CreatePlanRequest | UpdatePlanRequest = {
      plan_name: form.planName.trim(),
      base_commission_percentage: `${Math.round(Number.parseFloat(form.baseCommissionPercentage) * 100)}`,
      commission_duration_type: form.commissionDurationType,
      duration_months: form.commissionDurationType === "x_months" ? Number.parseInt(form.durationMonths, 10) : undefined,
      description: form.description.trim() || undefined,
      is_active: form.isActive,
    }

    try {
      if (editingPlan) {
        await plansService.update(editingPlan.id, payload)
        success("Plan updated successfully")
      } else {
        await plansService.create(payload as CreatePlanRequest)
        success("Plan created successfully")
      }

      setIsDialogOpen(false)
      await fetchPlans(page, true)
    } catch (saveError: any) {
      error(saveError?.message || "Failed to save plan")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (plan: Plan) => {
    try {
      await plansService.toggle(plan.id)
      success(`Plan ${plan.isActive ? "deactivated" : "activated"} successfully`)
      await fetchPlans(page, true)
    } catch (toggleError: any) {
      error(toggleError?.message || "Failed to update plan")
    }
  }

  const handleSetDefault = async (plan: Plan) => {
    try {
      await plansService.setDefault(plan.id)
      success("Default plan updated successfully")
      await fetchPlans(page, true)
    } catch (toggleError: any) {
      error(toggleError?.message || "Failed to set default plan")
    }
  }

  const handleDelete = async () => {
    if (!planToDelete) return

    setIsDeleting(true)
    try {
      await plansService.delete(planToDelete.id)
      success("Plan deleted successfully")
      setPlanToDelete(null)
      await fetchPlans(page, true)
    } catch (deleteError: any) {
      error(deleteError?.message || "Failed to delete plan")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<Plan>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Plan",
        cell: (plan) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{plan.planName}</span>
              {plan.isDefault ? <Badge>Default</Badge> : null}
            </div>
            <div className="text-xs text-muted-foreground">{plan.description || "No description"}</div>
          </div>
        ),
      },
      {
        key: "commission",
        header: "Commission",
        cell: (plan) => formatPercent(plan.baseCommissionPercentage, 1),
      },
      {
        key: "duration",
        header: "Duration",
        cell: (plan) => formatPlanDurationLabel(plan.commissionDurationType, plan.durationMonths),
      },
      {
        key: "status",
        header: "Status",
        cell: (plan) => <Badge variant={plan.isActive ? "default" : "secondary"}>{plan.isActive ? "Active" : "Inactive"}</Badge>,
      },
      {
        key: "actions",
        header: "",
        className: "w-12 text-right",
        cell: (plan) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(plan)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggle(plan)}>
                  <Power className="size-4" />
                  {plan.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                {!plan.isDefault ? (
                  <DropdownMenuItem onClick={() => handleSetDefault(plan)}>
                    <Star className="size-4" />
                    Set default
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setPlanToDelete(plan)}>
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
        title="Plans"
        description="Manage commission plans used for affiliate assignments."
        onRefresh={() => fetchPlans(page, true)}
        isRefreshing={isRefreshing}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add plan
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total plans" value={summary.total} />
        <StatCard label="Active" value={summary.active} />
        <StatCard label="Inactive" value={summary.inactive} />
        <StatCard label="Default plans" value={summary.defaults} />
      </div>

      <FilterBar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search plans"
      />

      {isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          title={query ? "No plans match this search" : "No plans found"}
          description={query ? "Try a different term." : "Create the first commission plan."}
          action={!query ? <Button onClick={openCreate}>Create plan</Button> : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredPlans}
            rowKey={(plan) => plan.id}
            emptyTitle="No plans found"
            emptyDescription="Create the first commission plan."
          />
          {!query ? (
            <DataTablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(nextPage) => {
                setPage(nextPage)
                void fetchPlans(nextPage)
              }}
            />
          ) : null}
        </>
      )}

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingPlan ? "Edit plan" : "Create plan"}
        description="Set the base commission, duration, and active state."
        onSubmit={handleSave}
        submitLabel={editingPlan ? "Save changes" : "Create plan"}
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="plan-name">Plan name</Label>
          <Input id="plan-name" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-commission">Commission percentage</Label>
          <Input
            id="plan-commission"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={form.baseCommissionPercentage}
            onChange={(event) => setForm((current) => ({ ...current, baseCommissionPercentage: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-duration-type">Duration type</Label>
          <Select
            value={form.commissionDurationType}
            onValueChange={(value: CreatePlanRequest["commission_duration_type"]) =>
              setForm((current) => ({ ...current, commissionDurationType: value }))
            }
          >
            <SelectTrigger id="plan-duration-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_month">One month</SelectItem>
              <SelectItem value="lifetime">Lifetime</SelectItem>
              <SelectItem value="x_months">Custom months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.commissionDurationType === "x_months" ? (
          <div className="space-y-2">
            <Label htmlFor="plan-duration-months">Duration months</Label>
            <Input
              id="plan-duration-months"
              type="number"
              min="1"
              value={form.durationMonths}
              onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="plan-description">Description</Label>
          <Textarea
            id="plan-description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={4}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive plans cannot be assigned to affiliates.</p>
          </div>
          <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!planToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPlanToDelete(null)
          }
        }}
        title="Delete plan?"
        description={`This will permanently remove ${planToDelete?.planName ?? "this plan"}.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
