import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

/**
 * Maps a domain status string to one of the four shadcn Badge variants.
 * No custom colors — design baseline only.
 *  - default (primary):  positive / completed states
 *  - destructive:        failures / rejections
 *  - secondary:          neutral / inactive
 *  - outline:            pending / in-progress
 */
const variantByStatus: Record<string, BadgeVariant> = {
  approved: "default",
  active: "default",
  completed: "default",
  resolved: "default",
  paid: "default",
  success: "default",

  pending: "outline",
  in_progress: "outline",
  processing: "outline",
  on_hold: "outline",
  requested: "outline",

  rejected: "destructive",
  failed: "destructive",
  suspended: "destructive",
  chargeback: "destructive",
  cancelled: "destructive",
  canceled: "destructive",

  inactive: "secondary",
  deleted: "secondary",
  draft: "secondary",
  test: "secondary",
}

interface StatusBadgeProps {
  status: string | null | undefined
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status ?? "").toLowerCase().trim()
  const variant = variantByStatus[normalized] ?? "secondary"
  const label = normalized ? normalized.replace(/_/g, " ") : "unknown"

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {label}
    </Badge>
  )
}
