'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import type { AccountType, Role } from '@/lib/types'

interface AuthGuardProps {
  children: React.ReactNode
  /** If set, redirect to this path when the user's role/accountType doesn't match */
  requiredAccountType?: AccountType
  requiredRoles?: Role[]
  redirectTo?: string
}

export function AuthGuard({
  children,
  requiredAccountType,
  requiredRoles,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (requiredAccountType && user.accountType !== requiredAccountType) {
      router.replace(redirectTo)
      return
    }
    if (requiredRoles && (!user.role || !requiredRoles.includes(user.role))) {
      router.replace(redirectTo)
    }
  }, [user, isLoading, router, requiredAccountType, requiredRoles, redirectTo])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-base text-muted-foreground">Učitavanje…</p>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
