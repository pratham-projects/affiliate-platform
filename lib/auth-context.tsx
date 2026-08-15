"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { User, UserRole } from "./types"
import { authService, tokenManager, setOnUnauthorized, ApiRequestError } from "./api"
import { clearRequestCache } from "@/lib/api/client"
import { notify } from "@/components/ui/notification"
import { API_BASE_URL } from "./api"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getRedirectPath(role: UserRole): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin"
    case "affiliate":
      return "/"
    default:
      return "/"
  }
}

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/admin/login"]

// Try to refresh the token
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) return false

    const data = await response.json()

    if (data.status === 'success' && data.data?.tokens) {
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = data.data.tokens
      tokenManager.setTokens(accessToken, newRefreshToken || refreshToken, expiresIn)
      return true
    }

    return false
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)
  const previousRole = useRef<UserRole | null>(null)

  // Logout function - clears all localStorage data
  const logout = useCallback(async () => {
    try {
      await authService.logout() // eagerly clears tokens & cache internally
    } finally {
      setUser(null)
      // Hard reload ensures all module-level state (sessionVersion, requestCache,
      // isRefreshing, etc.) is fully reset for the next session.
      const isAdminPath = window.location.pathname?.startsWith("/admin")
      window.location.href = isAdminPath ? "/admin/login" : "/login"
    }
  }, [])

  // Set up unauthorized callback for automatic logout on token refresh failure
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null)
      tokenManager.clearTokens()
      clearRequestCache()
      const isAdminPath = window.location.pathname?.startsWith("/admin")
      window.location.href = isAdminPath ? "/admin/login" : "/login"
    })
  }, [])

  // Auto-login flow on app load - runs only once
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const tryAutoLogin = async () => {
      const isPublicPath = PUBLIC_PATHS.some(p => pathname?.startsWith(p)) || pathname === "/"

      // Step 1: Check if we have stored tokens
      if (!tokenManager.hasTokens()) {
        setIsLoading(false)
        if (!isPublicPath) {
          router.push("/login")
        }
        return
      }

      // Step 2: Check if token is still valid (not expired with 60s buffer)
      if (tokenManager.hasValidSession()) {
        // Token is valid - restore session immediately from localStorage
        const storedUser = authService.getStoredUser()
        if (storedUser) {
          setUser(storedUser)
          setIsLoading(false)
          if (isPublicPath) {
            router.push(getRedirectPath(storedUser.role))
          }
          return
        }
      }

      // Step 3: Token expired - try refresh token flow
      const refreshed = await tryRefreshToken()

      if (refreshed) {
        // Refresh successful - restore user from localStorage
        const storedUser = authService.getStoredUser()
        if (storedUser) {
          setUser(storedUser)
          if (isPublicPath) {
            router.push(getRedirectPath(storedUser.role))
          }
        } else if (isPublicPath) {
          router.push("/")
        }
      } else {
        // Refresh failed - clear stale data and show login
        tokenManager.clearTokens()
        setUser(null)
        if (!isPublicPath) {
          const isAdminPath = pathname?.startsWith("/admin")
          router.push(isAdminPath ? "/admin/login" : "/login")
        }
      }

      setIsLoading(false)
    }

    tryAutoLogin()
  }, [pathname, router])

  // Login function
  const login = async (email: string, password: string) => {
    setError(null)

    try {
      const response = await authService.login({ email, password })
      setUser(response.user)
      notify.success("Login successful")
      const redirectPath = getRedirectPath(response.user.role)
      router.push(redirectPath)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
        notify.error(err.message)
      } else {
        setError("An unexpected error occurred. Please try again.")
        notify.error("An unexpected error occurred. Please try again.")
      }
      throw err
    }
  }

  const clearError = () => setError(null)

  // Wipe cached GETs when role changes across sessions to avoid cross-role reuse
  useEffect(() => {
    if (!user?.role) return
    if (previousRole.current && previousRole.current !== user.role) {
      clearRequestCache()
    }
    previousRole.current = user.role
  }, [user?.role])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function isSuperAdmin(role?: UserRole): boolean {
  return role === "super_admin"
}

export function isAdmin(role?: UserRole): boolean {
  return role === "admin" || role === "super_admin"
}

export function isAffiliate(role?: UserRole): boolean {
  return role === "affiliate"
}
