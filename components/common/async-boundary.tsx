import type React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/empty-state"

interface AsyncBoundaryProps {
  /** True while the initial load is in flight. */
  loading: boolean
  /** Error message, if the load failed. */
  error?: string | null
  /** True when the load succeeded but there is no data. */
  isEmpty?: boolean
  /** Skeleton shown while loading. */
  loadingFallback: React.ReactNode
  /** Optional retry handler shown on error. */
  onRetry?: () => void
  /** Empty-state overrides. */
  emptyTitle?: string
  emptyDescription?: string
  children: React.ReactNode
}

/**
 * Wraps an async section: shows a skeleton while loading, an error block on
 * failure, an empty state when there's no data, and the children otherwise.
 * Long API latency is expected, so every data section should use this.
 */
export function AsyncBoundary({
  loading,
  error,
  isEmpty,
  loadingFallback,
  onRetry,
  emptyTitle,
  emptyDescription,
  children,
}: AsyncBoundaryProps) {
  if (loading) return <>{loadingFallback}</>

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Something went wrong"
        description={error}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
          ) : undefined
        }
      />
    )
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return <>{children}</>
}
