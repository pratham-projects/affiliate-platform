import { USER_KEY } from "./config"

export type StoredUserRole = "super_admin" | "admin" | "affiliate" | string | null

export const getStoredUserRole = (): StoredUserRole => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { role?: string }
    return parsed?.role ?? null
  } catch {
    return null
  }
}

export const isStoredAffiliate = (): boolean => getStoredUserRole() === "affiliate"
