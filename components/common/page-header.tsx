import type React from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  /** Right-aligned actions (buttons, etc.) */
  actions?: React.ReactNode
  /** When provided, renders a refresh button next to the actions. */
  onRefresh?: () => void
  isRefreshing?: boolean
}

/**
 * Canonical page heading used at the top of every dashboard page.
 * Plain: title + optional description on the left, actions on the right.
 */
export function PageHeader({ title, description, actions, onRefresh, isRefreshing }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {(actions || onRefresh) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} title="Refresh">
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
              <span className="sr-only">Refresh</span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
