"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react"
import {
  DataTable,
  DetailRow,
  EmptyState,
  FormDialog,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { assignmentsService } from "@/lib/api/assignments"
import { conversionTypesService, type ConversionType } from "@/lib/api/conversion-types"
import { affiliatesService, type DetailedSummary } from "@/lib/api/affiliates"
import { plansService, type Plan } from "@/lib/api/plans"
import { referralCodesService } from "@/lib/api/referral-codes"
import { sitesService, type Site } from "@/lib/api/sites"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { validateReferralCode } from "@/lib/utils/referral-code"

type ChangePlanFormState = {
  commissionOverride: string
  durationType: string
  durationMonths: string
}

type AddCodeFormState = {
  siteId: string
  code: string
}

type AssignSiteFormState = {
  siteId: string
}

type AssignPlanFormState = {
  planId: string
}

type ConversionTypeFormState = {
  name: string
  description: string
  isActive: boolean
}

const INITIAL_CHANGE_PLAN_FORM: ChangePlanFormState = {
  commissionOverride: "",
  durationType: "default",
  durationMonths: "",
}

const INITIAL_CODE_FORM: AddCodeFormState = {
  siteId: "",
  code: "",
}

const INITIAL_TYPE_FORM: ConversionTypeFormState = {
  name: "",
  description: "",
  isActive: true,
}

export default function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const affiliateId = Number.parseInt(id, 10)
  const router = useRouter()
  const { success, error } = useNotification()

  const [data, setData] = useState<DetailedSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [isAddCodeOpen, setIsAddCodeOpen] = useState(false)
  const [isAssignSiteOpen, setIsAssignSiteOpen] = useState(false)
  const [isAssignPlanOpen, setIsAssignPlanOpen] = useState(false)
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null)

  const [changePlanForm, setChangePlanForm] = useState<ChangePlanFormState>(INITIAL_CHANGE_PLAN_FORM)
  const [codeForm, setCodeForm] = useState<AddCodeFormState>(INITIAL_CODE_FORM)
  const [siteForm, setSiteForm] = useState<AssignSiteFormState>({ siteId: "" })
  const [planForm, setPlanForm] = useState<AssignPlanFormState>({ planId: "" })

  const [availableSites, setAvailableSites] = useState<Site[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [allConversionTypes, setAllConversionTypes] = useState<ConversionType[]>([])
  const [selectedConversionTypeIds, setSelectedConversionTypeIds] = useState<number[]>([])
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [conversionTypeForm, setConversionTypeForm] = useState<ConversionTypeFormState>(INITIAL_TYPE_FORM)

  const fetchData = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setErrorMessage(null)

      try {
        const result = await affiliatesService.getDetailedSummary(affiliateId)
        if (!result) {
          setErrorMessage("Affiliate not found")
          return
        }

        setData(result)
        setSelectedConversionTypeIds((result.conversionTypes ?? []).map((conversionType) => conversionType.id))
      } catch (loadError: any) {
        setErrorMessage(loadError?.message || "Failed to load affiliate details")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [affiliateId],
  )

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!isAssignSiteOpen || !data) return

    void (async () => {
      try {
        const response = await sitesService.getAll({ limit: 100, status: "active" })
        const assignedSiteIds = new Set(data.sites.map((site) => site.siteId))
        setAvailableSites(response.sites.filter((site) => !assignedSiteIds.has(site.id)))
      } catch {
        setAvailableSites([])
      }
    })()
  }, [data, isAssignSiteOpen])

  useEffect(() => {
    if (!isAssignPlanOpen || !data) return

    void (async () => {
      try {
        const response = await plansService.getAll({ limit: 100 })
        const assignedPlanIds = new Set(data.plans.map((plan) => plan.planId))
        setAvailablePlans(response.plans.filter((plan) => plan.isActive && !assignedPlanIds.has(plan.id)))
      } catch {
        setAvailablePlans([])
      }
    })()
  }, [data, isAssignPlanOpen])

  useEffect(() => {
    void (async () => {
      try {
        const types = await conversionTypesService.getAll()
        setAllConversionTypes(types)
      } catch {
        setAllConversionTypes([])
      }
    })()
  }, [])

  const selectedAssignment = useMemo(() => {
    return data?.plans.find((plan) => plan.assignmentId === editingAssignmentId) ?? null
  }, [data?.plans, editingAssignmentId])

  useEffect(() => {
    if (!selectedAssignment) {
      setChangePlanForm(INITIAL_CHANGE_PLAN_FORM)
      return
    }

    setChangePlanForm({
      commissionOverride: selectedAssignment.hasOverride ? `${Number(selectedAssignment.effectiveCommission) / 100}` : "",
      durationType: selectedAssignment.hasOverride ? selectedAssignment.effectiveDurationType : "default",
      durationMonths: selectedAssignment.effectiveDurationMonths ? `${selectedAssignment.effectiveDurationMonths}` : "",
    })
  }, [selectedAssignment])

  const handleStatusUpdate = async (action: "approve" | "reject" | "suspend" | "unsuspend") => {
    if (!data) return

    setIsSaving(true)
    try {
      if (action === "approve") {
        await affiliatesService.approve(data.affiliate.id)
      } else if (action === "reject") {
        await affiliatesService.reject(data.affiliate.id)
      } else if (action === "suspend") {
        await affiliatesService.suspend(data.affiliate.id)
      } else {
        await affiliatesService.unsuspend(data.affiliate.id)
      }

      success("Affiliate updated")
      await fetchData(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update affiliate")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignSite = async () => {
    if (!siteForm.siteId) {
      error("Select a site")
      return
    }

    setIsSaving(true)
    try {
      await assignmentsService.createSiteAssignment({
        affiliateId,
        siteId: Number(siteForm.siteId),
      })
      success("Site assigned")
      setIsAssignSiteOpen(false)
      setSiteForm({ siteId: "" })
      await fetchData(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to assign site")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignPlan = async () => {
    if (!planForm.planId) {
      error("Select a plan")
      return
    }

    setIsSaving(true)
    try {
      await assignmentsService.createPlanAssignment({
        affiliateId,
        planId: Number(planForm.planId),
      })
      success("Plan assigned")
      setIsAssignPlanOpen(false)
      setPlanForm({ planId: "" })
      await fetchData(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to assign plan")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePlanOverride = async () => {
    if (!selectedAssignment) return

    setIsSaving(true)
    try {
      await assignmentsService.updatePlanAssignment(selectedAssignment.assignmentId, {
        customCommissionOverride: changePlanForm.commissionOverride
          ? `${Math.round(Number.parseFloat(changePlanForm.commissionOverride) * 100)}`
          : undefined,
        customDurationOverride: changePlanForm.durationType !== "default" ? (changePlanForm.durationType as any) : undefined,
        customDurationMonths:
          changePlanForm.durationType === "x_months" && changePlanForm.durationMonths
            ? Number(changePlanForm.durationMonths)
            : undefined,
      })
      success("Plan override updated")
      setEditingAssignmentId(null)
      await fetchData(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update assignment")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddReferralCode = async () => {
    if (!codeForm.siteId) {
      error("Select a site")
      return
    }

    const validationError = validateReferralCode(codeForm.code)
    if (validationError) {
      error(validationError)
      return
    }

    setIsSaving(true)
    try {
      await referralCodesService.create({
        affiliateId,
        siteId: Number(codeForm.siteId),
        code: codeForm.code.trim() || undefined,
      })
      success("Referral code created")
      setIsAddCodeOpen(false)
      setCodeForm(INITIAL_CODE_FORM)
      await fetchData(true)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to create referral code")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveConversionTypeAssignments = async () => {
    setIsSaving(true)
    try {
      const updatedTypes = await conversionTypesService.assignToAffiliate(affiliateId, selectedConversionTypeIds)
      setData((current) => (current ? { ...current, conversionTypes: updatedTypes } : current))
      success("Affiliate conversion types updated")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to update conversion types")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveConversionType = async () => {
    if (!conversionTypeForm.name.trim()) {
      error("Conversion type name is required")
      return
    }

    setIsSaving(true)
    try {
      if (editingTypeId) {
        await conversionTypesService.update(editingTypeId, {
          name: conversionTypeForm.name.trim(),
          description: conversionTypeForm.description.trim() || undefined,
          isActive: conversionTypeForm.isActive,
        })
        success("Conversion type updated")
      } else {
        await conversionTypesService.create({
          name: conversionTypeForm.name.trim(),
          description: conversionTypeForm.description.trim() || undefined,
          isActive: conversionTypeForm.isActive,
        })
        success("Conversion type created")
      }

      const types = await conversionTypesService.getAll()
      setAllConversionTypes(types)
      setEditingTypeId(null)
      setConversionTypeForm(INITIAL_TYPE_FORM)
    } catch (submitError: any) {
      error(submitError?.message || "Failed to save conversion type")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditType = (conversionType: ConversionType) => {
    setEditingTypeId(conversionType.id)
    setConversionTypeForm({
      name: conversionType.name,
      description: conversionType.description ?? "",
      isActive: conversionType.isActive,
    })
  }

  const handleDeleteType = async (conversionTypeId: number) => {
    setIsSaving(true)
    try {
      await conversionTypesService.delete(conversionTypeId)
      const types = await conversionTypesService.getAll()
      setAllConversionTypes(types)
      setSelectedConversionTypeIds((current) => current.filter((id) => id !== conversionTypeId))
      success("Conversion type deleted")
    } catch (submitError: any) {
      error(submitError?.message || "Failed to delete conversion type")
    } finally {
      setIsSaving(false)
    }
  }

  const referralCodeColumns: Column<DetailedSummary["referralCodes"][number]>[] = [
    {
      key: "code",
      header: "Code",
      cell: (code) => (
        <div className="space-y-1">
          <div className="font-medium">{code.code}</div>
          <div className="text-xs text-muted-foreground">{code.siteName}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (code) => <Badge variant={code.isActive ? "default" : "secondary"}>{code.isActive ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "performance",
      header: "Performance",
      cell: (code) => `${code.totalClicks} clicks / ${code.totalConversions} conversions`,
    },
    {
      key: "lastUsed",
      header: "Last used",
      cell: (code) => code.lastUsedAt ? new Date(code.lastUsedAt).toLocaleDateString("en-GB") : "Never",
    },
  ]

  const recentConversionColumns: Column<DetailedSummary["recentConversions"][number]>[] = [
    {
      key: "site",
      header: "Site",
      cell: (conversion) => conversion.siteName,
    },
    {
      key: "purchase",
      header: "Purchase",
      cell: (conversion) => formatCurrency(conversion.purchaseAmount),
    },
    {
      key: "commission",
      header: "Commission",
      cell: (conversion) => `${formatCurrency(conversion.commissionAmount)} (${formatPercent(conversion.commissionPercentage, 1)})`,
    },
    {
      key: "status",
      header: "Status",
      cell: (conversion) => <Badge variant="secondary">{conversion.status}</Badge>,
    },
  ]

  const recentPaymentColumns: Column<DetailedSummary["recentPayments"][number]>[] = [
    {
      key: "amount",
      header: "Amount",
      cell: (payment) => formatCurrency(payment.amount),
    },
    {
      key: "status",
      header: "Status",
      cell: (payment) => <Badge variant="secondary">{payment.status}</Badge>,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (payment) => new Date(payment.createdAt).toLocaleDateString("en-GB"),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (payment) => payment.notes || "—",
    },
  ]

  const recentClickColumns: Column<DetailedSummary["recentClicks"][number]>[] = [
    {
      key: "code",
      header: "Code",
      cell: (click) => click.code,
    },
    {
      key: "site",
      header: "Site",
      cell: (click) => click.siteName,
    },
    {
      key: "referrer",
      header: "Referrer",
      cell: (click) => click.referrer || "—",
    },
    {
      key: "createdAt",
      header: "Clicked",
      cell: (click) => new Date(click.createdAt).toLocaleDateString("en-GB"),
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Affiliate" description="Loading affiliate details" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Clicks" value="—" loading />
          <StatCard label="Conversions" value="—" loading />
          <StatCard label="Approved commission" value="—" loading />
          <StatCard label="Pending commission" value="—" loading />
        </div>
        <TableSkeleton rows={8} columns={4} />
      </div>
    )
  }

  if (errorMessage || !data) {
    return (
      <EmptyState
        title="Unable to load affiliate"
        description={errorMessage ?? "The affiliate record could not be loaded."}
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            Go back
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.user.fullName}
        description={data.user.email}
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        actions={
          <>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {data.user.status === "pending" ? (
              <>
                <Button onClick={() => handleStatusUpdate("approve")} disabled={isSaving}>
                  Approve
                </Button>
                <Button variant="outline" onClick={() => handleStatusUpdate("reject")} disabled={isSaving}>
                  Reject
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => handleStatusUpdate(data.user.status === "suspended" ? "unsuspend" : "suspend")} disabled={isSaving}>
                {data.user.status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StatusBadge status={data.user.status as any} />
        <span>Tracking ID: {data.affiliate.trackingId}</span>
        <span>Contact: {data.affiliate.contactPlatform || "—"} / {data.affiliate.contactIdentifier || "—"}</span>
        <span>Joined {new Date(data.user.registrationDate).toLocaleDateString("en-GB")}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clicks" value={data.stats.totalClicks} />
        <StatCard label="Conversions" value={data.stats.totalConversions} hint={`${data.stats.approvedConversions} approved`} />
        <StatCard label="Approved commission" value={formatCurrency(data.stats.approvedCommission)} />
        <StatCard label="Pending commission" value={formatCurrency(data.stats.pendingCommission)} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="codes">Referral codes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="conversion-types">Conversion types</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Core account and contact details.</CardDescription>
              </CardHeader>
              <CardContent>
                <DetailRow label="Company">{data.user.companyName || "—"}</DetailRow>
                <DetailRow label="Country">{data.user.country || "—"}</DetailRow>
                <DetailRow label="Phone">{data.user.phone || "—"}</DetailRow>
                <DetailRow label="Source URL">{data.affiliate.sourceUrl || "—"}</DetailRow>
                <DetailRow label="Pending balance">{formatCurrency(data.affiliate.pendingBalance)}</DetailRow>
                <DetailRow label="Total earned">{formatCurrency(data.affiliate.totalEarned)}</DetailRow>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
                <CardDescription>Revenue and conversion quality at a glance.</CardDescription>
              </CardHeader>
              <CardContent>
                <DetailRow label="Conversion rate">{formatPercent(data.stats.conversionRate, 1)}</DetailRow>
                <DetailRow label="Average order value">{formatCurrency(data.stats.averageOrderValue)}</DetailRow>
                <DetailRow label="Total revenue">{formatCurrency(data.stats.totalRevenue)}</DetailRow>
                <DetailRow label="Approved revenue">{formatCurrency(data.stats.approvedRevenue)}</DetailRow>
                <DetailRow label="Unique customers">{data.stats.uniqueCustomers}</DetailRow>
                <DetailRow label="Completed payments">{data.stats.completedPayments}</DetailRow>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance by site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.performanceBySite.length === 0 ? (
                <EmptyState title="No site performance yet" description="Traffic and conversions will appear after this affiliate starts sending activity." />
              ) : (
                data.performanceBySite.map((site) => (
                  <div key={site.siteId} className="rounded-md border px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{site.siteName}</p>
                        <p className="text-sm text-muted-foreground">{site.description || "No description"}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{site.conversions} conversions</p>
                        <p className="text-muted-foreground">{formatCurrency(site.approvedCommission)} approved commission</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Assigned plans</CardTitle>
                  <CardDescription>Commission plans currently linked to this affiliate.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAssignPlanOpen(true)}>
                  <Plus className="size-4" />
                  Assign plan
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.plans.length === 0 ? (
                  <EmptyState title="No plans assigned" description="Assign an active commission plan to this affiliate." />
                ) : (
                  data.plans.map((plan) => (
                    <div key={plan.assignmentId} className="rounded-md border px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plan.planName}</span>
                            {!plan.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
                            {plan.hasOverride ? <Badge variant="outline">Override</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatPercent(plan.effectiveCommission, 1)} for {plan.effectiveDurationType === "x_months" ? `${plan.effectiveDurationMonths} months` : plan.effectiveDurationType.replaceAll("_", " ")}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingAssignmentId(plan.assignmentId)}>
                          <Pencil className="size-4" />
                          Change
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Assigned sites</CardTitle>
                  <CardDescription>Sites where this affiliate can create tracking links and codes.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAssignSiteOpen(true)}>
                  <Plus className="size-4" />
                  Assign site
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.sites.length === 0 ? (
                  <EmptyState title="No sites assigned" description="Assign an active site before creating referral codes." />
                ) : (
                  data.sites.map((site) => (
                    <div key={site.assignmentId} className="rounded-md border px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{site.siteName}</p>
                          <p className="text-sm text-muted-foreground">{site.baseUrl}</p>
                        </div>
                        <Badge variant={site.isActive ? "default" : "secondary"}>
                          {site.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="codes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Referral codes</CardTitle>
                <CardDescription>Codes linked to this affiliate&apos;s assigned sites.</CardDescription>
              </div>
              <Button onClick={() => setIsAddCodeOpen(true)} disabled={data.sites.length === 0}>
                <Plus className="size-4" />
                Add referral code
              </Button>
            </CardHeader>
            <CardContent>
              {data.referralCodes.length === 0 ? (
                <EmptyState title="No referral codes yet" description="Assign a site first, then create a referral code." />
              ) : (
                <DataTable columns={referralCodeColumns} data={data.referralCodes} rowKey={(code) => code.codeId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent conversions</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentConversions.length === 0 ? (
                <EmptyState title="No conversions yet" description="Recent conversion activity will appear here." />
              ) : (
                <DataTable columns={recentConversionColumns} data={data.recentConversions} rowKey={(conversion) => conversion.id} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent payments</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentPayments.length === 0 ? (
                  <EmptyState title="No payments yet" description="Payment history will appear here." />
                ) : (
                  <DataTable columns={recentPaymentColumns} data={data.recentPayments} rowKey={(payment) => payment.id} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent clicks</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentClicks.length === 0 ? (
                  <EmptyState title="No clicks yet" description="Recent click activity will appear here." />
                ) : (
                  <DataTable columns={recentClickColumns} data={data.recentClicks} rowKey={(click) => click.id} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned conversion types</CardTitle>
              <CardDescription>Pick the event types this affiliate can use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allConversionTypes.length === 0 ? (
                <EmptyState title="No conversion types available" description="Create a conversion type below, then assign it to this affiliate." />
              ) : (
                <div className="space-y-3">
                  {allConversionTypes.map((conversionType) => (
                    <label key={conversionType.id} className="flex items-start gap-3 rounded-md border px-4 py-3">
                      <Checkbox
                        checked={selectedConversionTypeIds.includes(conversionType.id)}
                        onCheckedChange={(checked) => {
                          setSelectedConversionTypeIds((current) => {
                            if (checked) {
                              return Array.from(new Set([...current, conversionType.id]))
                            }

                            return current.filter((id) => id !== conversionType.id)
                          })
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{conversionType.name}</span>
                          <Badge variant={conversionType.isActive ? "default" : "secondary"}>
                            {conversionType.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{conversionType.description || "No description"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleEditType(conversionType)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteType(conversionType.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <Button onClick={handleSaveConversionTypeAssignments} disabled={isSaving}>
                <Check className="size-4" />
                Save assignments
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{editingTypeId ? "Edit conversion type" : "Create conversion type"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="detail-conversion-type-name">Name</Label>
                <Input
                  id="detail-conversion-type-name"
                  value={conversionTypeForm.name}
                  onChange={(event) => setConversionTypeForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-conversion-type-description">Description</Label>
                <Textarea
                  id="detail-conversion-type-description"
                  rows={3}
                  value={conversionTypeForm.description}
                  onChange={(event) => setConversionTypeForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive types remain in history but stay hidden from new usage.</p>
                </div>
                <Checkbox
                  checked={conversionTypeForm.isActive}
                  onCheckedChange={(checked) => setConversionTypeForm((current) => ({ ...current, isActive: checked === true }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveConversionType} disabled={isSaving}>
                  {editingTypeId ? "Save changes" : "Create type"}
                </Button>
                {editingTypeId ? (
                  <Button variant="outline" onClick={() => {
                    setEditingTypeId(null)
                    setConversionTypeForm(INITIAL_TYPE_FORM)
                  }}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={isAssignSiteOpen}
        onOpenChange={setIsAssignSiteOpen}
        title="Assign site"
        description="Link an active site so this affiliate can use it for referral codes."
        onSubmit={handleAssignSite}
        submitLabel="Assign site"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="detail-site-id">Site</Label>
          <Select value={siteForm.siteId} onValueChange={(value) => setSiteForm({ siteId: value })}>
            <SelectTrigger id="detail-site-id">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {availableSites.map((site) => (
                <SelectItem key={site.id} value={`${site.id}`}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      <FormDialog
        open={isAssignPlanOpen}
        onOpenChange={setIsAssignPlanOpen}
        title="Assign plan"
        description="Choose an active commission plan for this affiliate."
        onSubmit={handleAssignPlan}
        submitLabel="Assign plan"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="detail-plan-id">Plan</Label>
          <Select value={planForm.planId} onValueChange={(value) => setPlanForm({ planId: value })}>
            <SelectTrigger id="detail-plan-id">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {availablePlans.map((plan) => (
                <SelectItem key={plan.id} value={`${plan.id}`}>{plan.planName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      <FormDialog
        open={isAddCodeOpen}
        onOpenChange={setIsAddCodeOpen}
        title="Add referral code"
        description="Create a code for one of the affiliate's assigned sites."
        onSubmit={handleAddReferralCode}
        submitLabel="Create code"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="detail-code-site-id">Site</Label>
          <Select value={codeForm.siteId} onValueChange={(value) => setCodeForm((current) => ({ ...current, siteId: value }))}>
            <SelectTrigger id="detail-code-site-id">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {data.sites.map((site) => (
                <SelectItem key={site.siteId} value={`${site.siteId}`}>{site.siteName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-code-value">Custom code</Label>
          <Input
            id="detail-code-value"
            value={codeForm.code}
            onChange={(event) => setCodeForm((current) => ({ ...current, code: event.target.value }))}
            placeholder="Leave blank to auto-generate"
          />
        </div>
      </FormDialog>

      <FormDialog
        open={!!selectedAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAssignmentId(null)
          }
        }}
        title="Change plan override"
        description={`Adjust overrides for ${selectedAssignment?.planName ?? "this plan"}.`}
        onSubmit={handleSavePlanOverride}
        submitLabel="Save changes"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="detail-plan-commission-override">Commission override</Label>
          <Input
            id="detail-plan-commission-override"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={changePlanForm.commissionOverride}
            onChange={(event) => setChangePlanForm((current) => ({ ...current, commissionOverride: event.target.value }))}
            placeholder="Leave blank to use the plan default"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-plan-duration-type">Duration override</Label>
          <Select
            value={changePlanForm.durationType}
            onValueChange={(value) => setChangePlanForm((current) => ({ ...current, durationType: value }))}
          >
            <SelectTrigger id="detail-plan-duration-type">
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
        {changePlanForm.durationType === "x_months" ? (
          <div className="space-y-2">
            <Label htmlFor="detail-plan-duration-months">Duration months</Label>
            <Input
              id="detail-plan-duration-months"
              type="number"
              min="1"
              value={changePlanForm.durationMonths}
              onChange={(event) => setChangePlanForm((current) => ({ ...current, durationMonths: event.target.value }))}
            />
          </div>
        ) : null}
      </FormDialog>
    </div>
  )
}
