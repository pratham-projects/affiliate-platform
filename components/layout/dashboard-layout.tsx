"use client"

import type React from "react"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"

export function DashboardLayout({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
}) {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      const isAdminPath = window.location.pathname.startsWith("/admin")
      window.location.href = isAdminPath ? "/admin/login" : "/login"
    } else if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = user.role === "affiliate" ? "/" : "/admin"
    }
  }, [user, isLoading, allowedRoles])

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
