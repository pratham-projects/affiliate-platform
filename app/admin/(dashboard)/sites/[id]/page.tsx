"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Code,
  ExternalLink,
  Globe,
  KeyRound,
  Mail,
  Plus,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"
import {
  AsyncBoundary,
  CopyButton,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type Column,
} from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/components/ui/notification"
import { affiliatesService, type Affiliate } from "@/lib/api/affiliates"
import { assignmentsService } from "@/lib/api/assignments"
import { authService } from "@/lib/api/auth"
import { parseApiError } from "@/lib/api/errors"
import { referralCodesService } from "@/lib/api/referral-codes"
import { sitesService, type SiteDetailedSummary } from "@/lib/api/sites"
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils"
import { validateReferralCode } from "@/lib/utils/referral-code"

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { success, error: notifyError } = useNotification()
  const fetchedRef = useRef(false)

  const [data, setData] = useState<SiteDetailedSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddCode, setShowAddCode] = useState(false)
  const [showAssignAffiliate, setShowAssignAffiliate] = useState(false)
  const [showCreateAffiliate, setShowCreateAffiliate] = useState(false)

  const siteId = Number(params.id)

  const fetchData = useCallback(async (silent = false) => {
    if (!siteId || Number.isNaN(siteId)) return

    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const result = await sitesService.getDetailedSummary(siteId)
      setData(result)
    } catch (loadError) {
      setError(parseApiError(loadError).message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [siteId])

  useEffect(() => {
    if (fetchedRef.current || !siteId || Number.isNaN(siteId)) return
    fetchedRef.current = true
    void fetchData()
  }, [fetchData, siteId])

  const conversionColumns: Column<SiteDetailedSummary["siteConversions"][number]>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.affiliateName}</div>
            <div className="text-xs text-muted-foreground">{row.customerEmail || "No customer email"}</div>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Purchase",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatCurrency(row.purchaseAmount, row.currency),
      },
      {
        key: "commission",
        header: "Commission",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatCurrency(row.commissionAmount),
      },
      {
        key: "status",
        header: "Status",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  )

  const payoutColumns: Column<SiteDetailedSummary["recentPayouts"][number]>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.affiliateName}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</div>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatCurrency(row.amount),
      },
      {
        key: "status",
        header: "Status",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  )

  const codeColumns: Column<SiteDetailedSummary["referralCodes"][number]>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        cell: (row) => (
          <div className="space-y-1">
            <code className="rounded bg-muted px-2 py-1 text-xs">{row.code}</code>
            <div className="text-xs text-muted-foreground">{row.label || "System generated"}</div>
          </div>
        ),
      },
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.affiliateName}</div>
            <div className="text-xs text-muted-foreground">{row.affiliateEmail}</div>
          </div>
        ),
      },
      {
        key: "performance",
        header: "Performance",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => `${formatNumber(row.totalConversions)} conv / ${formatNumber(row.totalClicks)} clicks`,
      },
      {
        key: "status",
        header: "Status",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
      },
    ],
    [],
  )

  const affiliateColumns: Column<SiteDetailedSummary["affiliates"][number]>[] = useMemo(
    () => [
      {
        key: "affiliate",
        header: "Affiliate",
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.fullName}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "assigned",
        header: "Assigned",
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => formatDate(row.assignmentDate),
      },
    ],
    [],
  )

  if (!siteId || Number.isNaN(siteId)) {
    return <EmptyState title="Invalid site" description="The requested site ID is not valid." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.site.name ?? "Site detail"}
        description={data?.site.baseUrl ?? "Review site performance, keys, affiliates, and referral codes."}
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/sites")}>
              <ArrowLeft className="size-4" />
              Back to sites
            </Button>
            <Button variant="outline" onClick={() => setShowAssignAffiliate(true)}>
              <Users className="size-4" />
              Assign affiliate
            </Button>
            <Button variant="outline" onClick={() => setShowCreateAffiliate(true)}>
              <UserPlus className="size-4" />
              Create affiliate
            </Button>
            <Button onClick={() => setShowAddCode(true)}>
              <Plus className="size-4" />
              Add referral code
            </Button>
          </div>
        }
      />

      <AsyncBoundary
        loading={isLoading && !data}
        error={error}
        loadingFallback={<SiteDetailSkeleton />}
        onRetry={() => fetchData()}
      >
        {data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total conversions"
                value={formatNumber(data.stats.totalConversions)}
                hint={`${formatNumber(data.stats.approvedConversions)} approved`}
                icon={BarChart3}
              />
              <StatCard
                label="Total revenue"
                value={formatCurrency(data.stats.totalRevenue)}
                hint={`AOV ${formatCurrency(data.stats.averageOrderValue)}`}
                icon={Wallet}
              />
              <StatCard
                label="Assigned affiliates"
                value={formatNumber(data.affiliates.length)}
                hint={`${formatNumber(data.referralCodes.length)} referral codes`}
                icon={Users}
              />
              <StatCard
                label="Paid out"
                value={formatCurrency(data.stats.totalPaid)}
                hint={`${formatNumber(data.stats.completedPayouts)} payouts completed`}
                icon={Wallet}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Site overview</CardTitle>
                  <CardDescription>Core configuration and tracking details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow label="Status" value={<StatusBadge status={data.site.status} />} />
                  <DetailRow
                    label="Signature verification"
                    value={
                      <div className="flex items-center gap-2">
                        {data.site.requireSignatureVerification ? (
                          <ShieldCheck className="size-4 text-muted-foreground" />
                        ) : (
                          <Shield className="size-4 text-muted-foreground" />
                        )}
                        <span>{data.site.requireSignatureVerification ? "Required" : "Optional"}</span>
                      </div>
                    }
                  />
                  <DetailRow
                    label="Base URL"
                    value={
                      <a
                        href={data.site.baseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
                      >
                        <Globe className="size-4" />
                        {data.site.baseUrl}
                        <ExternalLink className="size-4" />
                      </a>
                    }
                  />
                  <DetailRow label="Created" value={formatDateTime(data.site.createdAt)} />
                  <DetailRow label="Updated" value={formatDateTime(data.site.updatedAt)} />
                  {data.site.description && <DetailRow label="Description" value={data.site.description} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">API keys</CardTitle>
                  <CardDescription>Credentials used to submit tracked conversions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Public API key</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={data.site.publicApiKey} className="font-mono text-xs" />
                      <CopyButton value={data.site.publicApiKey} label="Copy" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Private API key</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={data.site.privateApiKey} className="font-mono text-xs" type="password" />
                      <CopyButton value={data.site.privateApiKey} label="Copy" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="conversions" className="space-y-4">
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="conversions">Conversions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="codes">Referral codes</TabsTrigger>
                <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
              </TabsList>

              <TabsContent value="conversions" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Recent conversions</CardTitle>
                    <CardDescription>Latest conversion events recorded for this site.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={conversionColumns}
                      data={data.siteConversions}
                      rowKey={(row) => row.id}
                      emptyTitle="No conversions yet"
                      emptyDescription="Tracked conversions will appear here."
                      className="border-0"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Recent payouts</CardTitle>
                    <CardDescription>Latest payout activity linked to this site.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={payoutColumns}
                      data={data.recentPayouts}
                      rowKey={(row) => row.id}
                      emptyTitle="No payouts yet"
                      emptyDescription="Payout activity will appear here after settlements begin."
                      className="border-0"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="codes" className="mt-0">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">Referral codes</CardTitle>
                        <CardDescription>Codes assigned to affiliates for this site.</CardDescription>
                      </div>
                      <Button onClick={() => setShowAddCode(true)}>
                        <Plus className="size-4" />
                        Add code
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={codeColumns}
                        data={data.referralCodes}
                        rowKey={(row) => row.codeId}
                        emptyTitle="No referral codes"
                        emptyDescription="Create a referral code to start attributing traffic."
                        className="border-0"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Top referral codes</CardTitle>
                      <CardDescription>Best-performing codes by conversions and commission.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.topReferralCodes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No ranking data available yet.</p>
                      ) : (
                        data.topReferralCodes.map((code) => (
                          <div key={code.codeId} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-1">
                              <code className="rounded bg-muted px-2 py-1 text-xs">{code.code}</code>
                              <div className="text-sm font-medium">{code.affiliateName}</div>
                            </div>
                            <div className="text-right text-sm">
                              <div>{formatNumber(code.conversions)} conversions</div>
                              <div className="text-muted-foreground">{formatCurrency(code.commission)} commission</div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="affiliates" className="mt-0">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">Assigned affiliates</CardTitle>
                        <CardDescription>Affiliates linked to this site for attribution.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowAssignAffiliate(true)}>
                          <Users className="size-4" />
                          Assign existing
                        </Button>
                        <Button onClick={() => setShowCreateAffiliate(true)}>
                          <UserPlus className="size-4" />
                          Create and assign
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={affiliateColumns}
                        data={data.affiliates}
                        rowKey={(row) => row.assignmentId}
                        emptyTitle="No affiliates assigned"
                        emptyDescription="Assign an affiliate to connect site traffic to payouts."
                        className="border-0"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Affiliate performance</CardTitle>
                      <CardDescription>Revenue and commission contribution by affiliate.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.performanceByAffiliate.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No affiliate performance data available.</p>
                      ) : (
                        data.performanceByAffiliate.map((affiliate) => (
                          <div key={affiliate.affiliateId} className="grid gap-2 rounded-lg border p-4 md:grid-cols-4">
                            <div>
                              <div className="font-medium">{affiliate.affiliateName}</div>
                              <div className="text-xs text-muted-foreground">{affiliate.affiliateEmail}</div>
                            </div>
                            <div className="text-sm">
                              <div className="text-muted-foreground">Conversions</div>
                              <div>{formatNumber(affiliate.conversions)}</div>
                            </div>
                            <div className="text-sm">
                              <div className="text-muted-foreground">Revenue</div>
                              <div>{formatCurrency(affiliate.revenue)}</div>
                            </div>
                            <div className="text-sm">
                              <div className="text-muted-foreground">Approved commission</div>
                              <div>{formatCurrency(affiliate.approvedCommission)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <EmptyState title="Site not found" description="The requested site could not be loaded." />
        )}
      </AsyncBoundary>

      {data && (
        <>
          <AddReferralCodeDialog
            open={showAddCode}
            onOpenChange={setShowAddCode}
            siteId={data.site.id}
            assignedAffiliates={data.affiliates}
            onSuccess={async () => {
              success("Site summary refreshed")
              await fetchData(true)
            }}
          />
          <AssignAffiliateDialog
            open={showAssignAffiliate}
            onOpenChange={setShowAssignAffiliate}
            siteId={data.site.id}
            assignedAffiliateIds={data.affiliates.map((affiliate) => affiliate.affiliateId)}
            onSuccess={() => fetchData(true)}
          />
          <CreateAffiliateDialog
            open={showCreateAffiliate}
            onOpenChange={setShowCreateAffiliate}
            siteId={data.site.id}
            onSuccess={() => fetchData(true)}
          />
        </>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

function SiteDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCard key={index} label="Loading" value="" loading />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <TableSkeleton rows={5} columns={2} />
        <TableSkeleton rows={4} columns={2} />
      </div>
      <TableSkeleton rows={6} columns={4} />
    </div>
  )
}

function AddReferralCodeDialog({
  open,
  onOpenChange,
  siteId,
  assignedAffiliates,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: number
  assignedAffiliates: SiteDetailedSummary["affiliates"]
  onSuccess: () => void | Promise<void>
}) {
  const { success, error } = useNotification()
  const [affiliateId, setAffiliateId] = useState("")
  const [customCode, setCustomCode] = useState("")
  const [customCodeError, setCustomCodeError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setAffiliateId("")
    setCustomCode("")
    setCustomCodeError(null)
  }, [open])

  const handleSubmit = async () => {
    const validationError = validateReferralCode(customCode)
    if (validationError) {
      setCustomCodeError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      await referralCodesService.create({
        affiliateId: Number(affiliateId),
        siteId,
        ...(customCode.trim() ? { code: customCode.trim() } : {}),
      })
      success("Referral code created successfully")
      onOpenChange(false)
      await onSuccess()
    } catch (submitError: any) {
      error(submitError?.message || "Failed to create referral code")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add referral code</DialogTitle>
          <DialogDescription>Create a code for an affiliate already assigned to this site.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Affiliate</Label>
            <Select value={affiliateId} onValueChange={setAffiliateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an affiliate" />
              </SelectTrigger>
              <SelectContent>
                {assignedAffiliates.map((affiliate) => (
                  <SelectItem key={affiliate.affiliateId} value={affiliate.affiliateId.toString()}>
                    {affiliate.fullName} ({affiliate.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-code">Custom code</Label>
            <Input
              id="custom-code"
              value={customCode}
              onChange={(event) => {
                setCustomCode(event.target.value)
                setCustomCodeError(validateReferralCode(event.target.value))
              }}
              placeholder="Optional. Leave blank to auto-generate."
            />
            <p className={`text-xs ${customCodeError ? "text-destructive" : "text-muted-foreground"}`}>
              {customCodeError || "Letters, numbers, hyphens, and underscores are allowed."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!affiliateId || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssignAffiliateDialog({
  open,
  onOpenChange,
  siteId,
  assignedAffiliateIds,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: number
  assignedAffiliateIds: number[]
  onSuccess: () => void | Promise<void>
}) {
  const { success, error } = useNotification()
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [affiliateId, setAffiliateId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (!open) return

    setIsFetching(true)
    void affiliatesService
      .getAll({ limit: 100 })
      .then((response) => {
        setAffiliates(
          response.affiliates.filter(
            (affiliate) => affiliate.status === "approved" && !assignedAffiliateIds.includes(affiliate.id),
          ),
        )
        setAffiliateId("")
      })
      .finally(() => setIsFetching(false))
  }, [assignedAffiliateIds, open])

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await assignmentsService.createSiteAssignment({
        affiliateId: Number(affiliateId),
        siteId,
      })
      success("Affiliate assigned successfully")
      onOpenChange(false)
      await onSuccess()
    } catch (submitError: any) {
      error(submitError?.message || "Failed to assign affiliate")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign affiliate</DialogTitle>
          <DialogDescription>Attach an approved affiliate to this site.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Affiliate</Label>
            <Select value={affiliateId} onValueChange={setAffiliateId} disabled={isFetching || affiliates.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isFetching
                      ? "Loading affiliates..."
                      : affiliates.length === 0
                        ? "No eligible affiliates"
                        : "Select an affiliate"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {affiliates.map((affiliate) => (
                  <SelectItem key={affiliate.id} value={affiliate.id.toString()}>
                    {affiliate.fullName} ({affiliate.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!affiliateId || isLoading || affiliates.length === 0}>
            {isLoading ? "Assigning..." : "Assign affiliate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateAffiliateDialog({
  open,
  onOpenChange,
  siteId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: number
  onSuccess: () => void | Promise<void>
}) {
  const { success, error } = useNotification()
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    companyName: "",
    country: "",
    contactPlatform: "telegram" as "telegram" | "whatsapp" | "skype" | "teams",
    contactIdentifier: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormData({
      email: "",
      fullName: "",
      companyName: "",
      country: "",
      contactPlatform: "telegram",
      contactIdentifier: "",
      password: Math.random().toString(36).slice(-10),
    })
  }, [open])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const registration = await authService.register(formData)
      const affiliate = await affiliatesService.getByUserId(registration.userId)

      if (!affiliate) {
        throw new Error("Created user not found as affiliate")
      }

      if (affiliate.status !== "approved") {
        await affiliatesService.approve(affiliate.id)
      }

      await assignmentsService.createSiteAssignment({
        affiliateId: affiliate.id,
        siteId,
      })

      success("Affiliate created and assigned successfully")
      onOpenChange(false)
      await onSuccess()
    } catch (submitError: any) {
      error(submitError?.message || "Failed to create and assign affiliate")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create and assign affiliate</DialogTitle>
          <DialogDescription>Register a new affiliate account and link it to this site.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="affiliate-name">Full name</Label>
            <Input
              id="affiliate-name"
              value={formData.fullName}
              onChange={(event) => setFormData((current) => ({ ...current, fullName: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliate-email">Email</Label>
            <Input
              id="affiliate-email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="affiliate-company">Company</Label>
              <Input
                id="affiliate-company"
                value={formData.companyName}
                onChange={(event) => setFormData((current) => ({ ...current, companyName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliate-country">Country</Label>
              <Input
                id="affiliate-country"
                value={formData.country}
                onChange={(event) => setFormData((current) => ({ ...current, country: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact platform</Label>
              <Select
                value={formData.contactPlatform}
                onValueChange={(value: "telegram" | "whatsapp" | "skype" | "teams") =>
                  setFormData((current) => ({ ...current, contactPlatform: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="skype">Skype</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliate-identifier">Contact identifier</Label>
              <Input
                id="affiliate-identifier"
                value={formData.contactIdentifier}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, contactIdentifier: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliate-password">Password</Label>
            <Input
              id="affiliate-password"
              value={formData.password}
              onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create and assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
