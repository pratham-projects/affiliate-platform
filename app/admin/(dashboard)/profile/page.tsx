"use client"

import { useState } from "react"
import { KeyRound, Mail, Shield, User } from "lucide-react"
import { FormSkeleton, PageHeader } from "@/components/common"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { authService } from "@/lib/api"
import { parseApiError } from "@/lib/api/errors"

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
    return <AdminProfileSkeleton />
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Review your account details and keep your admin credentials secure."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="size-4 text-muted-foreground" />
              Account details
            </CardTitle>
            <CardDescription>Your authenticated admin profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{user.fullName}</div>
              </div>

              <div className="space-y-2">
                <Label>Email address</Label>
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
                <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                  {user.role === "super_admin" ? "Super Admin" : "Admin"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="size-4 text-muted-foreground" />
              Security
            </CardTitle>
            <CardDescription>Update your password to protect access to the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
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
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating password..." : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AdminProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Account details</CardTitle>
          </CardHeader>
          <CardContent>
            <FormSkeleton fields={3} />
          </CardContent>
        </Card>
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
