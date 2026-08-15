"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth, isAdmin } from "@/lib/auth-context"
import { AuthCard, FormSkeleton } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Shield, Sparkles, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { switchDemoRole } from "@/mock/auto-auth"

interface LoginPageContentProps {
    type: "affiliate" | "admin"
}

// Demo-only: the real backend account for this login screen. The password
// field on the actual upstream login form is untouched — this repo just
// prefills it and adds a one-click "Sign in as demo" shortcut so a visitor
// never has to guess credentials.
const DEMO_CREDENTIALS: Record<LoginPageContentProps["type"], { email: string; password: string }> = {
    affiliate: { email: "affiliate@demo.local", password: "demo1234" },
    admin: { email: "admin@demo.local", password: "demo1234" },
}

export function LoginPageContent({ type }: LoginPageContentProps) {
    const [email, setEmail] = useState(DEMO_CREDENTIALS[type].email)
    const [password, setPassword] = useState(DEMO_CREDENTIALS[type].password)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { user, login, isLoading, clearError } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && user) {
            if (isAdmin(user.role)) {
                router.push("/admin")
            } else {
                router.push("/")
            }
        }
    }, [user, isLoading, router])

    // Clear error when inputs change
    useEffect(() => {
        clearError()
    }, [email, password, clearError])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await login(email.trim(), password)
        } catch {
            // Error is handled by auth context with notification
        } finally {
            setIsSubmitting(false)
        }
    }

    const isAffiliate = type === "affiliate"
    const title = isAffiliate ? "Affiliate Login" : "Administrator Login"
    const description = isAffiliate
        ? "Sign in to track your conversions and earnings."
        : "Sign in to manage the affiliate platform."
    const header = (
        <div className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isAffiliate ? <User className="size-6" /> : <Shield className="size-6" />}
            </div>
            <div className="space-y-1">
                <h1 className="text-xl font-semibold text-foreground">
                    {isAffiliate ? "Get Affiliate Core" : "Admin Workspace"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isAffiliate ? "Access your affiliate dashboard." : "Access the admin dashboard."}
                </p>
            </div>
        </div>
    )

    if (isLoading || user) {
        return (
            <AuthCard
                title={title}
                description={user ? "Redirecting to your dashboard..." : "Checking your session..."}
                header={header}
            >
                <FormSkeleton fields={2} />
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title={title}
            description={description}
            header={header}
            footer={
                <div className="space-y-4 pt-4">
                    {isAffiliate ? (
                        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                            {"Don't have an affiliate account? "}
                            <Link href="/register" className="font-medium text-primary hover:underline">
                                Register
                            </Link>
                        </div>
                    ) : (
                        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                            Are you an affiliate partner?{" "}
                            <Link href="/login" className="font-medium text-primary hover:underline">
                                Switch to affiliate login
                            </Link>
                        </div>
                    )}
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        required
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <RefreshCw className="mr-2 size-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        "Sign in"
                    )}
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => switchDemoRole(isAffiliate ? "affiliate" : "admin")}
                >
                    <Sparkles className="mr-2 size-4" />
                    Sign in as demo
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                    Credentials are prefilled for this demo — sample data, no real account.
                </p>
            </form>
        </AuthCard>
    )
}
