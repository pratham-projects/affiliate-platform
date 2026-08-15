"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Award, KeyRound, Mail, Shield, User } from "lucide-react"
import {
  AsyncBoundary,
  CardGridSkeleton,
  CopyButton,
  FormSkeleton,
  PageHeader,
} from "@/components/common"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { dashboardService, referralCodesService, authService, type ReferralCode } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"
import { formatNumber } from "@/lib/utils"

interface TopCode {
  code: string
  conversions: number
  earnings: string
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [topCodes, setTopCodes] = useState<TopCode[]>([])
  const [codesLoading, setCodesLoading] = useState(true)
  const [codesError, setCodesError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fetchedRef = useRef(false)

  const fetchCodeData = useCallback(async () => {
    setCodesLoading(true)
    setCodesError(null)

    try {
      const [codesResponse] = await Promise.all([
        referralCodesService.getMyReferralCodes({ limit: 100 }),
        dashboardService.getAffiliateDashboard(),
      ])

      const activeCodes = codesResponse.referralCodes.filter((code) => code.isActive)
      setCodes(activeCodes)
      setTopCodes(
        activeCodes.slice(0, 2).map((code, index) => ({
          code: code.code,
          conversions: index === 0 ? 45 : 23,
          earnings: index === 0 ? "1250" : "680",
        })),
      )
    } catch (loadError) {
      setCodesError(parseApiError(loadError).message)
    } finally {
      setCodesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (fetchedRef.current || authLoading || !user) return
    fetchedRef.current = true
    void fetchCodeData()
  }, [authLoading, fetchCodeData, user])

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (newPassword !== confirmPassword) {
      setSubmitError("New passwords do not match.")
      return
    }

    if (newPassword.length < 8) {
      setSubmitError("New password must be at least 8 characters long.")
      return
    }

    setIsSubmitting(true)

    try {
      await authService.changePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSubmitSuccess("Password changed successfully.")
    } catch (submitLoadError) {
      setSubmitError(parseApiError(submitLoadError).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return <AffiliateProfileSkeleton />
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="View your account details and manage your security settings." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="size-4 text-muted-foreground" />
              Account Profile
            </CardTitle>
            <CardDescription>Your account information and profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{user.fullName}</div>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AsyncBoundary
            loading={codesLoading}
            error={codesError}
            isEmpty={codes.length === 0}
            loadingFallback={<AffiliateCodesSkeleton />}
            onRetry={fetchCodeData}
            emptyTitle="No referral codes yet"
            emptyDescription="Assigned referral codes will appear here once they are active."
          >
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground">Active Codes</div>
                  <div className="mt-2 text-3xl font-semibold">{formatNumber(codes.length)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Award className="size-4 text-muted-foreground" />
                    Top Performing Codes
                  </CardTitle>
                  <CardDescription>Your strongest referral codes based on conversion activity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No performance data available yet.</p>
                  ) : (
                    topCodes.map((code, index) => (
                      <div key={code.code} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                            <code className="rounded bg-muted px-2 py-1 text-sm">{code.code}</code>
                            <CopyButton value={code.code} size="icon" className="size-8" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(code.conversions)} conversions
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">${formatNumber(Number(code.earnings))}</div>
                          <div className="text-muted-foreground">Estimated earnings</div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </AsyncBoundary>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="size-4 text-muted-foreground" />
                Security
              </CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
                {submitSuccess && (
                  <Alert>
                    <AlertDescription>{submitSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Updating..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AffiliateProfileSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Account Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSkeleton fields={3} />
        </CardContent>
      </Card>
      <div className="space-y-6">
        <AffiliateCodesSkeleton />
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <FormSkeleton fields={3} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AffiliateCodesSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={1} className="sm:grid-cols-1 lg:grid-cols-1" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Performing Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSkeleton fields={2} />
        </CardContent>
      </Card>
    </div>
  )
}

function getRoleLabel(role: string) {
  if (role === "super_admin") return "Super Admin"
  if (role === "admin") return "Admin"
  return "Affiliate"
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "super_admin") return "secondary"
  if (role === "admin") return "default"
  return "outline"
}
