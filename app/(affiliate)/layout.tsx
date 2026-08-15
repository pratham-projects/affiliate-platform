"use client"
import type React from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["affiliate"]}>{children}</DashboardLayout>
}
