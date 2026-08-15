// Deterministic seed data generator for the Affiliate Platform demo.
//
// Everything downstream (dashboard totals, per-affiliate balances, analytics
// breakdowns) is *derived* from this one pass over sites/plans/affiliates/
// conversions rather than invented separately, so the numbers reconcile by
// construction:
//   - commissionAmount = purchaseAmount x the plan rate actually assigned
//     to that affiliate (custom override wins if present)
//   - totalEarned (affiliate) = sum of commissionAmount over their approved
//     conversions
//   - totalPaidOut = sum of commissionAmount over conversions whose payment
//     has settled ("completed")
//   - pendingBalance = totalEarned - totalPaidOut
//   - clicks >= conversions per referral code (clicks are derived AFTER
//     conversion counts are known)
//   - analytics breakdowns (referrer/os/browser/country/device) are
//     aggregated straight from the conversion rows, so they always sum to
//     the same totals as the underlying conversion list.
//
// Never Math.random() here — everything flows from the single seeded Rng
// instance so the same seed always reproduces the same dataset.

import { Rng } from "./rng"

export const DEMO_SEED = 20260815

// ---------- money helpers ----------
export const centsToStr = (cents: number) => (cents / 100).toFixed(2)
export const pctToStr = (pct: number) => pct.toFixed(2)

// ---------- static reference data ----------
const FIRST_NAMES = [
  "Maya", "Owen", "Priya", "Elias", "Noor", "Theo", "Ines", "Marcus", "Yuki", "Sana",
  "Diego", "Freya", "Kwame", "Lina", "Rowan", "Ada", "Felix", "Nadia", "Tobias", "Zara",
]
const LAST_NAMES = [
  "Chen", "Fischer", "Odusanya", "Marek", "Delgado", "Nakamura", "Larsen", "Okafor",
  "Bianchi", "Kowalski", "Reyes", "Almeida", "Novak", "Petrov", "Haddad", "Lindgren",
]
const COMPANY_SUFFIXES = ["Media", "Growth Partners", "Digital", "Collective", "Studio", "Labs", "Ventures"]
const COMPANY_STEMS = ["Northlane", "Cobalt", "Highline", "Driftwood", "Fernbank", "Silverpath", "Amberline", "Kestrel"]
const COUNTRIES = ["United States", "United Kingdom", "Germany", "India", "Canada", "Australia", "Brazil", "Netherlands"]
const CONTACT_PLATFORMS = ["telegram", "whatsapp", "skype", "teams"] as const

export interface SeedUser {
  id: number
  email: string
  password: string
  fullName: string
  role: "super_admin" | "admin" | "affiliate"
  status: "approved"
  affiliateId?: number
  createdAt: string
}

export interface SeedSite {
  id: number
  name: string
  baseUrl: string
  description: string
  status: "active" | "inactive"
  publicApiKey: string
  privateApiKey: string
  requireSignatureVerification: boolean
  createdAt: string
  updatedAt: string
}

export interface SeedPlan {
  id: number
  planName: string
  baseCommissionPercentage: string
  commissionDurationType: "one_month" | "lifetime" | "x_months"
  durationMonths: number | null
  description: string | null
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface SeedAffiliate {
  id: number
  userId: number
  email: string
  fullName: string
  companyName: string | null
  country: string | null
  phone: string | null
  contactPlatform: string | null
  contactIdentifier: string | null
  trackingId: string | null
  sourceUrl: string | null
  status: "pending" | "approved" | "rejected" | "suspended" | "deleted"
  createdAt: string
  updatedAt: string
}

export interface SeedPlanAssignment {
  id: number
  affiliateId: number
  planId: number
  customCommissionOverride: string | null
  customDurationOverride: "one_month" | "lifetime" | "x_months" | null
  customDurationMonths: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SeedSiteAssignment {
  id: number
  affiliateId: number
  siteId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SeedReferralCode {
  id: number
  affiliateId: number
  siteId: number
  code: string
  label: string | null
  isActive: boolean
  totalClicks: number
  totalConversions: number
  lastUsedAt: string | null
  createdAt: string
}

export interface SeedConversionType {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SeedConversion {
  id: number
  siteId: number
  affiliateId: number
  referralCodeId: number
  conversionDate: string
  purchaseAmountCents: number
  currency: string
  commissionPercentage: string
  commissionAmountCents: number
  conversionType: string
  status: "pending" | "approved" | "rejected" | "chargeback"
  isTest: boolean
  customerEmail: string
  createdAt: string
  referrer: string
  os: string
  browser: string
  country: string
  deviceType: string
  ipAddress: string
  landingPage: string
}

export interface SeedPayment {
  id: number
  conversionId: number
  affiliateId: number
  amountCents: number
  currency: string
  status: "pending" | "approved" | "rejected" | "completed" | "void"
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SeedPayout {
  id: number
  affiliateId: number
  requestedAmountCents: number
  approvedAmountCents: number | null
  currency: string
  status: "pending" | "approved" | "rejected" | "completed"
  includedConversionIds: number[]
  excludedConversionIds: number[]
  rejectionReason: string | null
  approvedByName: string | null
  approvedAt: string | null
  rejectedByName: string | null
  rejectedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SeedContactRequest {
  id: number
  affiliateId: number
  affiliateName: string
  affiliateEmail: string
  subject: string
  message: string
  requestType: "general_inquiry" | "technical_support" | "account_issue"
  amount: string | null
  currency: string
  status: "pending" | "in_progress" | "resolved" | "rejected"
  adminNotes: string | null
  createdAt: string
  updatedAt: string | null
  resolvedAt: string | null
}

export interface SeedNotification {
  id: number
  userId: number
  type: string
  category: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface SeedSetting {
  id: number
  settingKey: string
  settingValue: string
  dataType: "string" | "int" | "float" | "bool" | "json"
  description: string | null
  category: string
  updatedAt: string
}

export interface DemoDb {
  users: SeedUser[]
  sites: SeedSite[]
  plans: SeedPlan[]
  affiliates: SeedAffiliate[]
  planAssignments: SeedPlanAssignment[]
  siteAssignments: SeedSiteAssignment[]
  referralCodes: SeedReferralCode[]
  conversionTypes: SeedConversionType[]
  conversions: SeedConversion[]
  payments: SeedPayment[]
  payouts: SeedPayout[]
  contactRequests: SeedContactRequest[]
  notifications: SeedNotification[]
  settings: SeedSetting[]
  meta: {
    seed: number
    generatedAt: string
    windowDays: number
    demoAffiliateUserId: number
    demoAdminUserId: number
    demoSuperAdminUserId: number
  }
}

const REFERRERS = ["google.com", "direct", "newsletter", "twitter.com", "reddit.com", "producthunt.com", "bing.com", "facebook.com"]
const OSES = ["Windows", "macOS", "iOS", "Android", "Linux"]
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet"]
const COUNTRY_CODES = ["US", "GB", "DE", "IN", "CA", "AU", "BR", "NL"]
const DEVICE_TYPES = ["desktop", "mobile", "tablet"]

function isoDaysAgo(days: number, base: Date): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}

function pad(n: number, len = 2) {
  return n.toString().padStart(len, "0")
}

export function buildSeed(now: Date = new Date()): DemoDb {
  const rng = new Rng(DEMO_SEED)
  const WINDOW_DAYS = 400 // 13+ months of history for trend charts

  // ---------- sites ----------
  const siteDefs = [
    { name: "PulseMetrics", baseUrl: "https://pulsemetrics.io", description: "Product analytics for growth teams." },
    { name: "BrightLoop", baseUrl: "https://brightloop.app", description: "Customer feedback and NPS tooling." },
    { name: "VerdantCart", baseUrl: "https://verdantcart.com", description: "Headless checkout for D2C brands." },
  ]
  const sites: SeedSite[] = siteDefs.map((s, i) => ({
    id: i + 1,
    name: s.name,
    baseUrl: s.baseUrl,
    description: s.description,
    status: "active",
    publicApiKey: `pub_demo_${(i + 1).toString().padStart(4, "0")}`,
    privateApiKey: `priv_demo_${(i + 1).toString().padStart(4, "0")}`,
    requireSignatureVerification: i !== 2,
    createdAt: isoDaysAgo(WINDOW_DAYS + 30, now),
    updatedAt: isoDaysAgo(10, now),
  }))

  // ---------- plans ----------
  const planDefs: Array<[string, number, "one_month" | "lifetime" | "x_months", number | null, boolean, string]> = [
    ["Starter", 10, "lifetime", null, false, "Entry-level commission for new affiliates."],
    ["Growth", 15, "lifetime", null, true, "Default plan for approved affiliates."],
    ["Pro", 20, "lifetime", null, false, "For affiliates with consistent volume."],
    ["Elite", 25, "x_months", 12, false, "Negotiated rate, capped at 12 months."],
  ]
  const plans: SeedPlan[] = planDefs.map(([name, pct, durType, durMonths, isDefault], i) => ({
    id: i + 1,
    planName: name,
    baseCommissionPercentage: pctToStr(pct),
    commissionDurationType: durType,
    durationMonths: durMonths,
    description: planDefs[i][5] as unknown as string,
    isActive: true,
    isDefault,
    createdAt: isoDaysAgo(WINDOW_DAYS + 20, now),
    updatedAt: isoDaysAgo(20, now),
  })).map((p, i) => ({ ...p, description: planDefs[i][5] }))

  // ---------- conversion types ----------
  const conversionTypes: SeedConversionType[] = [
    { id: 1, name: "sale", description: "A completed purchase.", isActive: true, createdAt: isoDaysAgo(WINDOW_DAYS + 20, now), updatedAt: isoDaysAgo(20, now) },
    { id: 2, name: "signup", description: "A new account registration.", isActive: true, createdAt: isoDaysAgo(WINDOW_DAYS + 20, now), updatedAt: isoDaysAgo(20, now) },
    { id: 3, name: "trial", description: "A trial activation.", isActive: true, createdAt: isoDaysAgo(WINDOW_DAYS + 20, now), updatedAt: isoDaysAgo(20, now) },
    { id: 4, name: "lead", description: "A qualified lead form submission.", isActive: true, createdAt: isoDaysAgo(WINDOW_DAYS + 20, now), updatedAt: isoDaysAgo(20, now) },
  ]

  // ---------- affiliates + users ----------
  type Status = SeedAffiliate["status"]
  const statusPlan: Status[] = [
    ...Array(10).fill("approved"),
    "pending", "pending",
    "suspended",
    "rejected",
  ]

  const users: SeedUser[] = []
  const affiliates: SeedAffiliate[] = []

  users.push({
    id: 1, email: "super.admin@demo.local", password: "demo1234",
    fullName: "Priya Odusanya", role: "super_admin", status: "approved",
    createdAt: isoDaysAgo(WINDOW_DAYS + 40, now),
  })
  users.push({
    id: 2, email: "admin@demo.local", password: "demo1234",
    fullName: "Owen Marek", role: "admin", status: "approved",
    createdAt: isoDaysAgo(WINDOW_DAYS + 40, now),
  })

  let nextUserId = 3
  for (let i = 0; i < statusPlan.length; i++) {
    const affiliateId = i + 1
    const userId = nextUserId++
    const first = FIRST_NAMES[i % FIRST_NAMES.length]
    const last = LAST_NAMES[(i * 3 + 1) % LAST_NAMES.length]
    const fullName = `${first} ${last}`
    const company = rng.bool(0.7)
      ? `${rng.pick(COMPANY_STEMS)} ${rng.pick(COMPANY_SUFFIXES)}`
      : null
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@${(company ? company.split(" ")[0].toLowerCase() : "indie")}-demo.test`
    const status = statusPlan[i]
    const createdAt = isoDaysAgo(rng.int(30, WINDOW_DAYS + 10), now)

    users.push({
      id: userId, email, password: "demo1234", fullName,
      role: "affiliate", status: "approved", affiliateId, createdAt,
    })

    affiliates.push({
      id: affiliateId,
      userId,
      email,
      fullName,
      companyName: company,
      country: rng.pick(COUNTRIES),
      phone: rng.bool(0.6) ? `+1 555 0${rng.int(100, 999)}` : null,
      contactPlatform: rng.pick(CONTACT_PLATFORMS),
      contactIdentifier: `@${first.toLowerCase()}${last.toLowerCase()}`,
      trackingId: `AFF-${pad(affiliateId, 4)}`,
      sourceUrl: rng.bool(0.4) ? `https://${first.toLowerCase()}${last.toLowerCase()}.demo-blog.test` : null,
      status,
      createdAt,
      updatedAt: isoDaysAgo(rng.int(0, 20), now),
    })
  }

  // First seeded affiliate (id 1) is the one the demo auto-authenticates as.
  const demoAffiliateUser = users.find((u) => u.affiliateId === 1)!

  const approvedAffiliates = affiliates.filter((a) => a.status === "approved")

  // ---------- plan assignments (one per approved affiliate) ----------
  const planAssignments: SeedPlanAssignment[] = []
  approvedAffiliates.forEach((aff, i) => {
    const plan = rng.weightedPick(plans, [3, 5, 3, 1])
    const hasOverride = rng.bool(0.15)
    planAssignments.push({
      id: i + 1,
      affiliateId: aff.id,
      planId: plan.id,
      customCommissionOverride: hasOverride ? pctToStr(Number(plan.baseCommissionPercentage) + rng.int(1, 4)) : null,
      customDurationOverride: null,
      customDurationMonths: null,
      isActive: true,
      createdAt: aff.createdAt,
      updatedAt: aff.createdAt,
    })
  })

  function effectivePct(affiliateId: number): number {
    const pa = planAssignments.find((p) => p.affiliateId === affiliateId && p.isActive)
    if (!pa) return 10
    if (pa.customCommissionOverride) return Number(pa.customCommissionOverride)
    const plan = plans.find((p) => p.id === pa.planId)!
    return Number(plan.baseCommissionPercentage)
  }

  // ---------- site assignments + referral codes ----------
  const siteAssignments: SeedSiteAssignment[] = []
  const referralCodes: SeedReferralCode[] = []
  let saId = 1
  let codeId = 1
  const codeWordBank = ["SUMMIT", "ORBIT", "SPARK", "NORTH", "RIVER", "ATLAS", "ECHO", "COVE", "PRISM", "DELTA", "FORGE", "TIDE"]
  approvedAffiliates.forEach((aff) => {
    const siteCount = rng.int(1, 3)
    const assignedSites = rng.shuffle(sites).slice(0, siteCount)
    assignedSites.forEach((site) => {
      siteAssignments.push({
        id: saId++,
        affiliateId: aff.id,
        siteId: site.id,
        isActive: true,
        createdAt: aff.createdAt,
        updatedAt: aff.createdAt,
      })
      const code = `${rng.pick(codeWordBank)}${rng.int(10, 99)}`
      referralCodes.push({
        id: codeId++,
        affiliateId: aff.id,
        siteId: site.id,
        code,
        label: rng.bool(0.5) ? `${site.name} campaign` : null,
        isActive: true,
        totalClicks: 0, // filled in after conversions are generated
        totalConversions: 0,
        lastUsedAt: null,
        createdAt: aff.createdAt,
      })
    })
  })

  // ---------- conversions ----------
  const conversions: SeedConversion[] = []
  let conversionId = 1
  let customerCounter = 1
  const statusWeights: Array<[SeedConversion["status"], number]> = [
    ["approved", 70], ["pending", 12], ["rejected", 12], ["chargeback", 6],
  ]
  approvedAffiliates.forEach((aff) => {
    const codesForAff = referralCodes.filter((c) => c.affiliateId === aff.id)
    if (codesForAff.length === 0) return
    const conversionCount = rng.int(10, 28)
    for (let i = 0; i < conversionCount; i++) {
      const code = rng.pick(codesForAff)
      const daysAgo = rng.int(0, WINDOW_DAYS - 1)
      const conversionDate = isoDaysAgo(daysAgo, now)
      const purchaseAmountCents = rng.int(1500, 78000)
      const pct = effectivePct(aff.id)
      const commissionAmountCents = Math.round((purchaseAmountCents * pct) / 100)
      const status = rng.weightedPick(statusWeights.map((s) => s[0]), statusWeights.map((s) => s[1]))
      const type = rng.weightedPick(conversionTypes.map((t) => t.name), [55, 20, 15, 10])

      conversions.push({
        id: conversionId++,
        siteId: code.siteId,
        affiliateId: aff.id,
        referralCodeId: code.id,
        conversionDate,
        purchaseAmountCents,
        currency: "USD",
        commissionPercentage: pctToStr(pct),
        commissionAmountCents,
        conversionType: type,
        status,
        isTest: rng.bool(0.04),
        customerEmail: `shopper${customerCounter++}@example-shopper.test`,
        createdAt: conversionDate,
        referrer: rng.weightedPick(REFERRERS, [30, 20, 12, 10, 8, 8, 7, 5]),
        os: rng.weightedPick(OSES, [38, 28, 18, 12, 4]),
        browser: rng.weightedPick(BROWSERS, [55, 20, 12, 10, 3]),
        country: rng.weightedPick(COUNTRY_CODES, [35, 12, 10, 12, 8, 7, 8, 8]),
        deviceType: rng.weightedPick(DEVICE_TYPES, [58, 36, 6]),
        ipAddress: `${rng.int(20, 209)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`,
        landingPage: `/pricing?ref=${code.code}`,
      })
    }
  })

  // Backfill referral code click/conversion counters from the generated conversions.
  referralCodes.forEach((code) => {
    const codeConversions = conversions.filter((c) => c.referralCodeId === code.id)
    code.totalConversions = codeConversions.length
    const clickFactor = rng.int(3, 9)
    code.totalClicks = codeConversions.length * clickFactor + rng.int(8, 45)
    if (codeConversions.length > 0) {
      code.lastUsedAt = codeConversions
        .map((c) => c.conversionDate)
        .sort()
        .slice(-1)[0]
    }
  })

  // ---------- payments (one per approved conversion) ----------
  const payments: SeedPayment[] = []
  let paymentId = 1
  const paymentStatusWeights: Array<[SeedPayment["status"], number]> = [
    ["completed", 55], ["approved", 28], ["pending", 17],
  ]
  conversions
    .filter((c) => c.status === "approved")
    .forEach((c) => {
      const status = rng.weightedPick(paymentStatusWeights.map((s) => s[0]), paymentStatusWeights.map((s) => s[1]))
      const approvedAt = status !== "pending" ? isoDaysAgo(Math.max(0, WINDOW_DAYS - rng.int(0, 5) - 1), now) : null
      const completedAt = status === "completed" ? isoDaysAgo(rng.int(0, 20), now) : null
      payments.push({
        id: paymentId++,
        conversionId: c.id,
        affiliateId: c.affiliateId,
        amountCents: c.commissionAmountCents,
        currency: c.currency,
        status,
        approvedAt,
        rejectedAt: null,
        rejectionReason: null,
        completedAt,
        notes: null,
        createdAt: c.conversionDate,
        updatedAt: completedAt || approvedAt || c.conversionDate,
      })
    })

  // ---------- payouts (withdrawal requests, derived from payments) ----------
  const payouts: SeedPayout[] = []
  let payoutId = 1
  approvedAffiliates.forEach((aff) => {
    const affPayments = payments.filter((p) => p.affiliateId === aff.id)
    const completed = affPayments.filter((p) => p.status === "completed")
    const approved = affPayments.filter((p) => p.status === "approved")

    if (completed.length > 0) {
      const total = completed.reduce((sum, p) => sum + p.amountCents, 0)
      const completedAt = completed.map((p) => p.completedAt!).sort().slice(-1)[0]
      payouts.push({
        id: payoutId++,
        affiliateId: aff.id,
        requestedAmountCents: total,
        approvedAmountCents: total,
        currency: "USD",
        status: "completed",
        includedConversionIds: completed.map((p) => p.conversionId),
        excludedConversionIds: [],
        rejectionReason: null,
        approvedByName: "Owen Marek",
        approvedAt: completedAt,
        rejectedByName: null,
        rejectedAt: null,
        completedAt,
        notes: "Settled via demo payout batch.",
        createdAt: isoDaysAgo(rng.int(21, 40), now),
        updatedAt: completedAt,
      })
    }

    if (approved.length > 0) {
      const total = approved.reduce((sum, p) => sum + p.amountCents, 0)
      payouts.push({
        id: payoutId++,
        affiliateId: aff.id,
        requestedAmountCents: total,
        approvedAmountCents: null,
        currency: "USD",
        status: "pending",
        includedConversionIds: approved.map((p) => p.conversionId),
        excludedConversionIds: [],
        rejectionReason: null,
        approvedByName: null,
        approvedAt: null,
        rejectedByName: null,
        rejectedAt: null,
        completedAt: null,
        notes: null,
        createdAt: isoDaysAgo(rng.int(1, 6), now),
        updatedAt: isoDaysAgo(rng.int(1, 6), now),
      })
    }
  })

  // A couple of rejected payouts for UI variety.
  const rejectCandidates = approvedAffiliates.slice(0, 2)
  rejectCandidates.forEach((aff) => {
    const affPayments = payments.filter((p) => p.affiliateId === aff.id && p.status === "pending")
    if (affPayments.length === 0) return
    const chosen = affPayments.slice(0, 1)
    const total = chosen.reduce((sum, p) => sum + p.amountCents, 0)
    payouts.push({
      id: payoutId++,
      affiliateId: aff.id,
      requestedAmountCents: total,
      approvedAmountCents: null,
      currency: "USD",
      status: "rejected",
      includedConversionIds: chosen.map((p) => p.conversionId),
      excludedConversionIds: [],
      rejectionReason: "Requested amount exceeds current verified balance.",
      approvedByName: null,
      approvedAt: null,
      rejectedByName: "Priya Odusanya",
      rejectedAt: isoDaysAgo(rng.int(2, 10), now),
      completedAt: null,
      notes: null,
      createdAt: isoDaysAgo(rng.int(11, 18), now),
      updatedAt: isoDaysAgo(rng.int(2, 10), now),
    })
  })

  // ---------- contact requests ----------
  const contactRequests: SeedContactRequest[] = []
  const contactSubjects = [
    ["Payout delayed", "My last payout has been pending for over a week, can you check on it?", "account_issue"],
    ["Tracking link not recording clicks", "I don't think my referral link for VerdantCart is tracking correctly.", "technical_support"],
    ["Question about commission tiers", "How do I get moved to the Pro plan?", "general_inquiry"],
    ["Update payment details", "I need to change the payout details on file.", "account_issue"],
    ["Duplicate conversion flagged", "One of my conversions looks like a duplicate charge, please review.", "technical_support"],
    ["Site assignment request", "Can I get access to promote BrightLoop as well?", "general_inquiry"],
  ] as const
  let contactId = 1
  approvedAffiliates.slice(0, 6).forEach((aff, i) => {
    const [subject, message, type] = contactSubjects[i % contactSubjects.length]
    const createdAt = isoDaysAgo(rng.int(2, 60), now)
    const status = rng.weightedPick(["pending", "in_progress", "resolved", "rejected"] as const, [30, 20, 40, 10])
    contactRequests.push({
      id: contactId++,
      affiliateId: aff.id,
      affiliateName: aff.fullName,
      affiliateEmail: aff.email,
      subject,
      message,
      requestType: type,
      amount: null,
      currency: "USD",
      status,
      adminNotes: status === "resolved" ? "Resolved — confirmed with affiliate." : null,
      createdAt,
      updatedAt: status !== "pending" ? isoDaysAgo(rng.int(0, 2), now) : null,
      resolvedAt: status === "resolved" ? isoDaysAgo(rng.int(0, 2), now) : null,
    })
  })

  // ---------- notifications ----------
  const notifications: SeedNotification[] = []
  let notifId = 1
  const notifTemplates: Array<[string, string, string]> = [
    ["conversion", "New conversion recorded", "A new approved conversion was recorded on PulseMetrics."],
    ["payment", "Payout completed", "A payout request was marked completed."],
    ["affiliate", "New affiliate application", "A new affiliate signed up and is awaiting approval."],
    ["system", "Weekly summary ready", "Your weekly performance summary is ready to view."],
    ["conversion", "Conversion flagged for review", "A conversion was flagged as a possible chargeback."],
  ]
  for (let i = 0; i < 14; i++) {
    const [category, title, message] = notifTemplates[i % notifTemplates.length]
    notifications.push({
      id: notifId++,
      userId: rng.bool(0.5) ? demoAffiliateUser.id : 2,
      type: category,
      category,
      title,
      message,
      isRead: rng.bool(0.4),
      createdAt: isoDaysAgo(rng.int(0, 30), now),
    })
  }

  // ---------- settings ----------
  const settings: SeedSetting[] = [
    { id: 1, settingKey: "panel_name", settingValue: "Affiliate Platform (Demo)", dataType: "string", description: "Displayed panel name.", category: "branding", updatedAt: isoDaysAgo(30, now) },
    { id: 2, settingKey: "panel_logo_url", settingValue: "", dataType: "string", description: "Panel logo URL.", category: "branding", updatedAt: isoDaysAgo(30, now) },
    { id: 3, settingKey: "default_commission_percentage", settingValue: "15", dataType: "float", description: "Default commission rate for new plan assignments.", category: "commission", updatedAt: isoDaysAgo(30, now) },
    { id: 4, settingKey: "tracking_cookie_duration_days", settingValue: "30", dataType: "int", description: "Attribution window in days.", category: "tracking", updatedAt: isoDaysAgo(30, now) },
    { id: 5, settingKey: "smtp_host", settingValue: "smtp.demo.invalid", dataType: "string", description: "Outbound mail host (demo placeholder).", category: "email", updatedAt: isoDaysAgo(30, now) },
    { id: 6, settingKey: "smtp_port", settingValue: "587", dataType: "int", description: "Outbound mail port.", category: "email", updatedAt: isoDaysAgo(30, now) },
    { id: 7, settingKey: "smtp_username", settingValue: "no-reply@demo.invalid", dataType: "string", description: "SMTP username.", category: "email", updatedAt: isoDaysAgo(30, now) },
    { id: 8, settingKey: "email_from_name", settingValue: "Affiliate Platform Demo", dataType: "string", description: "From name on outbound email.", category: "email", updatedAt: isoDaysAgo(30, now) },
    { id: 9, settingKey: "max_password_age_days", settingValue: "90", dataType: "int", description: "Password rotation policy.", category: "security", updatedAt: isoDaysAgo(30, now) },
    { id: 10, settingKey: "require_2fa", settingValue: "false", dataType: "bool", description: "Require two-factor authentication.", category: "security", updatedAt: isoDaysAgo(30, now) },
  ]

  return {
    users,
    sites,
    plans,
    affiliates,
    planAssignments,
    siteAssignments,
    referralCodes,
    conversionTypes,
    conversions,
    payments,
    payouts,
    contactRequests,
    notifications,
    settings,
    meta: {
      seed: DEMO_SEED,
      generatedAt: now.toISOString(),
      windowDays: WINDOW_DAYS,
      demoAffiliateUserId: demoAffiliateUser.id,
      demoAdminUserId: 2,
      demoSuperAdminUserId: 1,
    },
  }
}
