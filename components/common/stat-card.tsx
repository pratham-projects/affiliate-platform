import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: React.ReactNode
  /** Optional secondary line under the value (e.g. "+12% vs last month"). */
  hint?: React.ReactNode
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

/** KPI tile for dashboards and analytics. Plain card, no gradients. */
export function StatCard({ label, value, hint, icon: Icon, loading, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
        )}
        {hint && !loading && <p className={cn("mt-1 text-xs text-muted-foreground")}>{hint}</p>}
      </CardContent>
    </Card>
  )
}
