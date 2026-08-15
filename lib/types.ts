// User & Auth Types
export type UserRole = "super_admin" | "admin" | "affiliate"
export type UserStatus = "pending" | "approved" | "rejected" | "suspended"
export type ContactPlatform = "teams" | "telegram" | "whatsapp" | "skype"

export interface User {
  id: string
  email: string
  fullName: string
  companyName?: string
  country: string
  role: UserRole
  status: UserStatus
  contactPlatform: ContactPlatform
  contactValue: string
  createdAt: string
  updatedAt: string
}

// Plan Types
export type CommissionDuration = "one_month" | "lifetime" | "custom"

export interface Plan {
  id: string
  name: string
  baseCommission: number
  commissionDuration: CommissionDuration
  customMonths?: number
  isDefault: boolean
}

export interface AffiliateConfig {
  affiliateId: string
  customCommission?: number
  customDuration?: CommissionDuration
  customMonths?: number
  assignedSites: string[]
}

// Site Types
export interface Site {
  id: string
  name: string
  baseUrl: string
  description?: string
  status: "active" | "inactive"
  publicApiKey: string
  privateApiKey: string
  requireSignature: boolean
  createdAt: string
}

// Conversion Types
export type ConversionStatus = "approved" | "pending" | "rejected" | "chargeback"

export interface Conversion {
  id: string
  affiliateId: string
  affiliateName: string
  siteId: string
  siteName: string
  customerEmail: string
  purchaseDate: string
  amount: number
  currency: string
  status: ConversionStatus
  commission: number
  referrer?: string
  landingPage?: string
  os?: string
  osVersion?: string
  browser?: string
  browserVersion?: string
  country?: string
  city?: string
  ip?: string
  createdAt: string
}

// Payment Types
export interface Payment {
  id: string
  affiliateId: string
  affiliateName: string
  amount: number
  paidAt: string
}

export interface AffiliateBalance {
  affiliateId: string
  affiliateName: string
  totalEarned: number
  totalPaid: number
  pendingBalance: number
}

// Report Types
export interface ReportMetrics {
  affiliateId: string
  affiliateName: string
  clicks: number
  customers: number
  conversions: number
  conversionAmount: number
  commission: number
}

// Settings Types
export interface SystemSettings {
  panelName: string
  logoUrl?: string
  defaultCommission: number
  cookieDuration: number
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpFrom?: string
}

// Notification Types
export type NotificationType = "affiliate" | "conversion" | "payment" | "site" | "system"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string
  read: boolean
  createdAt: string
}
