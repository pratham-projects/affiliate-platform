import { getDb } from "./db"
import type { SeedUser } from "./seed"

export function toApiUser(u: SeedUser) {
  const db = getDb()
  const affiliate = u.affiliateId ? db.affiliates.find((a) => a.id === u.affiliateId) : undefined
  return {
    id: String(u.id),
    email: u.email,
    fullName: u.fullName,
    companyName: affiliate?.companyName ?? undefined,
    country: affiliate?.country ?? "United States",
    role: u.role,
    status: "approved",
    contactPlatform: affiliate?.contactPlatform ?? "telegram",
    contactValue: affiliate?.contactIdentifier ?? "",
    createdAt: u.createdAt,
    updatedAt: u.createdAt,
  }
}
