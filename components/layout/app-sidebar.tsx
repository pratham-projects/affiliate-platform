"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageSquare,
  Settings,
  Tag,
  User,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: string[]
}

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin"] },
  { href: "/admin/sites", label: "Sites", icon: Globe, roles: ["super_admin"] },
  { href: "/admin/affiliates", label: "Affiliates", icon: Users, roles: ["super_admin", "admin"] },
  { href: "/admin/conversions", label: "Conversions", icon: ArrowLeftRight, roles: ["super_admin", "admin"] },
  { href: "/admin/payments", label: "Payments", icon: Wallet, roles: ["super_admin"] },
  { href: "/admin/plans", label: "Plans", icon: FileText, roles: ["super_admin", "admin"] },
  { href: "/admin/assignments", label: "Assignments", icon: Link2, roles: ["super_admin", "admin"] },
  { href: "/admin/conversion-types", label: "Conversion Types", icon: FileText, roles: ["super_admin", "admin"] },
  { href: "/admin/referral-codes", label: "Referral Codes", icon: Tag, roles: ["super_admin", "admin"] },
  { href: "/admin/requests", label: "Requests", icon: Inbox, roles: ["super_admin", "admin"] },
  { href: "/admin/payouts", label: "Payout Requests", icon: Banknote, roles: ["super_admin", "admin"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["super_admin", "admin"] },
  { href: "/test/webhooks", label: "Test Webhook", icon: Wrench, roles: ["super_admin"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["super_admin", "admin"] },
]

const affiliateNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/websites", label: "Websites", icon: Globe },
  { href: "/conversions", label: "My Conversions", icon: ArrowLeftRight },
  { href: "/payments", label: "My Payments", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/referral-codes", label: "Referral Codes", icon: Tag },
  { href: "/payouts", label: "Payouts", icon: Banknote },
  { href: "/contact", label: "Contact Us", icon: MessageSquare },
]

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  affiliate: "Affiliate",
}

function isItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === "/" || href === "/admin") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { setOpenMobile } = useSidebar()

  const navItems =
    user?.role === "affiliate"
      ? affiliateNavItems
      : adminNavItems.filter((item) => item.roles?.includes(user?.role ?? ""))

  const profileHref = user?.role === "affiliate" ? "/profile" : "/admin/profile"
  const closeMobile = () => setOpenMobile(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
            Get Affiliate Core
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isItemActive(pathname, item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href} onClick={closeMobile}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={user.fullName} className="h-auto py-2">
                <Link href={profileHref} onClick={closeMobile}>
                  <User />
                  <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">{user.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {roleLabel[user.role] ?? user.role}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logout()} tooltip="Logout">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
