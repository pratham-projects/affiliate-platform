'use client'

import { useAuth, isAdmin, isAffiliate } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  fallbackPath?: string
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push(fallbackPath)
      return
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(role => {
        if (role === 'admin') return isAdmin(user.role)
        if (role === 'affiliate') return isAffiliate(user.role)
        return user.role === role
      })

      if (!hasAllowedRole) {
        router.push('/dashboard')
      }
    }
  }, [user, isLoading, allowedRoles, fallbackPath, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => {
      if (role === 'admin') return isAdmin(user.role)
      if (role === 'affiliate') return isAffiliate(user.role)
      return user.role === role
    })

    if (!hasAllowedRole) {
      return null
    }
  }

  return <>{children}</>
}

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  )
}

interface AffiliateRouteProps {
  children: React.ReactNode
}

export function AffiliateRoute({ children }: AffiliateRouteProps) {
  return (
    <ProtectedRoute allowedRoles={['affiliate']}>
      {children}
    </ProtectedRoute>
  )
}
