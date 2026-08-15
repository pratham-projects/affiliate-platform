import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Role = "admin" | "affiliate" | "customer"

interface TypographyProps {
  children: ReactNode
  className?: string
  role?: Role
}

const roleColors = {
  admin: "text-primary",
  affiliate: "text-primary",
  customer: "text-primary",
}

export function TypographyH1({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl", className)}>
      {children}
    </h1>
  )
}

export function TypographyH2({ children, className }: TypographyProps) {
  return (
    <h2 className={cn("scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0", className)}>
      {children}
    </h2>
  )
}

export function TypographyH3({ children, className }: TypographyProps) {
  return (
    <h3 className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}>
      {children}
    </h3>
  )
}

export function TypographyH4({ children, className }: TypographyProps) {
  return (
    <h4 className={cn("scroll-m-20 text-lg font-semibold tracking-tight", className)}>
      {children}
    </h4>
  )
}

export function TypographyP({ children, className }: TypographyProps) {
  return (
    <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}>
      {children}
    </p>
  )
}

export function TypographySmall({
  children,
  className,
  muted = false,
}: TypographyProps & { muted?: boolean }) {
  return (
    <small className={cn("text-sm font-medium leading-none", muted && "text-muted-foreground", className)}>
      {children}
    </small>
  )
}

export function TypographyMuted({ children, className }: TypographyProps) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
}

export function TypographyBlockquote({ children, className }: TypographyProps) {
  return (
    <blockquote className={cn("mt-6 border-l-2 pl-6 italic", className)}>
      {children}
    </blockquote>
  )
}

export function TypographyCode({ children, className }: TypographyProps) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className
      )}
    >
      {children}
    </code>
  )
}

export function TypographyLink({
  children,
  className,
  role = "admin",
}: TypographyProps & { role?: Role }) {
  return (
    <a className={cn("font-medium underline underline-offset-4 hover:text-primary/80", roleColors[role], className)}>
      {children}
    </a>
  )
}

export function TypographyLabel({
  children,
  className,
}: TypographyProps) {
  return (
    <span className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </span>
  )
}

export function TypographyStatValue({
  children,
  className,
  highlight = false,
}: TypographyProps & { highlight?: boolean }) {
  return (
    <span className={cn(
      "text-xl sm:text-2xl font-semibold text-foreground",
      highlight && "text-primary",
      className
    )}>
      {children}
    </span>
  )
}

export function TypographyStatLabel({
  children,
  className,
}: TypographyProps) {
  return (
    <span className={cn("text-xs sm:text-sm text-muted-foreground", className)}>
      {children}
    </span>
  )
}

export function TypographyCardTitle({
  children,
  className,
}: TypographyProps) {
  return (
    <span className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </span>
  )
}

export function TypographyCardDescription({
  children,
  className,
}: TypographyProps) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </span>
  )
}
