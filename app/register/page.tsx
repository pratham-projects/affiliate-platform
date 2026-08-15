"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthCard } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, RefreshCw } from "lucide-react"
import Link from "next/link"
import type { ContactPlatform } from "@/lib/types"
import { authService, ApiRequestError } from "@/lib/api"
import { useNotification } from "@/components/ui/notification"

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Brazil",
  "Mexico",
  "Spain",
  "Italy",
]

const platforms: { value: ContactPlatform; label: string }[] = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "skype", label: "Skype" },
  { value: "teams", label: "Microsoft Teams" },
]

const emailRegex = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { error: showError } = useNotification()

  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [contactPlatform, setContactPlatform] = useState<ContactPlatform | "">("")
  const [contactIdentifier, setContactIdentifier] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      newErrors.email = "Email is required"
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm()

    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0]
      if (firstError) showError(firstError)
      return
    }

    setIsLoading(true)

    try {
      await authService.register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        country: country || undefined,
        contactPlatform: contactPlatform as ContactPlatform || undefined,
        contactIdentifier: contactIdentifier.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
      })
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "DUPLICATE_ERROR" || err.status === 409) {
          showError("An account with this email already exists. Try logging in or using password recovery.")
        } else {
          showError(err.message)
        }
      } else {
        showError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title="Registration submitted" description="Your account is awaiting admin approval.">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            You will be able to sign in after an admin reviews and approves your registration.
          </p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Back to login
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create affiliate account"
      description="Apply for access to the affiliate dashboard."
      containerClassName="max-w-lg"
      contentClassName="space-y-4"
      footer={
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setErrors((p) => ({ ...p, fullName: "" }))
              }}
              disabled={isLoading}
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              placeholder="Acme Inc"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrors((p) => ({ ...p, email: "" }))
            }}
            disabled={isLoading}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={setCountry} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="platform">Contact Platform</Label>
            <Select
              value={contactPlatform}
              onValueChange={(v) => setContactPlatform(v as ContactPlatform)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact Identifier</Label>
            <Input
              id="contact"
              placeholder="@username"
              value={contactIdentifier}
              onChange={(e) => setContactIdentifier(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Website or Traffic source URL</Label>
          <Input
            id="sourceUrl"
            placeholder="https://example.com or SEO, Social Media, etc."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors((p) => ({ ...p, password: "" }))
              }}
              disabled={isLoading}
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password *</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setErrors((p) => ({ ...p, confirmPassword: "" }))
              }}
              disabled={isLoading}
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Registration"
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
