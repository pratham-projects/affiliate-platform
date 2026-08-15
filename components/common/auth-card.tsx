import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  containerClassName?: string
}

export function AuthCard({
  title,
  description,
  children,
  header,
  footer,
  className,
  contentClassName,
  containerClassName,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={cn("w-full max-w-md space-y-4", containerClassName)}>
        {header}
        <Card className={cn("border-border bg-card", className)}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-foreground">{title}</CardTitle>
            {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
          </CardHeader>
          <CardContent className={contentClassName}>
            {children}
            {footer}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
