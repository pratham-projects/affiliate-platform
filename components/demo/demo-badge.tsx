"use client"

import { useEffect, useState } from "react"
import { RotateCcw, ShieldCheck, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { USER_KEY } from "@/lib/api/config"
import { switchDemoRole, type DemoRole } from "@/mock/auto-auth"
import { resetDb } from "@/mock/db"

const ROLE_LABEL: Record<DemoRole, string> = {
  affiliate: "Affiliate",
  admin: "Admin",
  super_admin: "Super Admin",
}

const ROLE_ICON: Record<DemoRole, React.ElementType> = {
  affiliate: User,
  admin: Users,
  super_admin: ShieldCheck,
}

export function DemoBadge() {
  const [role, setRole] = useState<DemoRole | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USER_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { role?: DemoRole }
        if (parsed.role) setRole(parsed.role)
      }
    } catch {
      // ignore
    }
  }, [])

  const Icon = role ? ROLE_ICON[role] : User

  const handleReset = () => {
    setResetting(true)
    resetDb()
    // Keep the same role, just rebuild the underlying data and reload.
    if (role) switchDemoRole(role)
    else window.location.reload()
  }

  return (
    <div className="fixed bottom-3 left-3 z-[999] flex items-center gap-2 rounded-full border border-border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <span className="ml-1.5 hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        Demo — sample data, no backend
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-full px-2.5 text-xs">
            <Icon className="size-3.5" />
            {role ? ROLE_LABEL[role] : "Switch role"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          {(Object.keys(ROLE_LABEL) as DemoRole[]).map((r) => {
            const RIcon = ROLE_ICON[r]
            return (
              <DropdownMenuItem key={r} onClick={() => switchDemoRole(r)}>
                <RIcon className="mr-2 size-4" />
                View as {ROLE_LABEL[r]}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 rounded-full px-2.5 text-xs"
        onClick={handleReset}
        disabled={resetting}
        title="Reset demo data — clears every edit made this session"
      >
        <RotateCcw className="size-3.5" />
        Reset data
      </Button>
    </div>
  )
}
