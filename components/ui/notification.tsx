"use client"

import type React from "react"
import { useMemo } from "react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type NotificationType = "success" | "warning" | "error" | "info"

type NotifyFn = (type: NotificationType, message: string, duration?: number) => void

const showNotification: NotifyFn = (type, message, duration = 6000) => {
  switch (type) {
    case "success":
      toast.success(message, { duration })
      break
    case "warning":
      toast.warning(message, { duration })
      break
    case "error":
      toast.error(message, { duration })
      break
    case "info":
      toast(message, { duration })
      break
  }
}

export const notify = {
  show: showNotification,
  success: (message: string, duration?: number) => showNotification("success", message, duration),
  warning: (message: string, duration?: number) => showNotification("warning", message, duration),
  error: (message: string, duration?: number) => showNotification("error", message, duration),
  info: (message: string, duration?: number) => showNotification("info", message, duration),
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors closeButton />
    </>
  )
}

export function useNotification() {
  return useMemo(
    () => ({
      notify: showNotification,
      success: (message: string, duration?: number) => showNotification("success", message, duration),
      warning: (message: string, duration?: number) => showNotification("warning", message, duration),
      error: (message: string, duration?: number) => showNotification("error", message, duration),
      info: (message: string, duration?: number) => showNotification("info", message, duration),
    }),
    [],
  )
}
