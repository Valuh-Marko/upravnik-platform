'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Loader } from '@/components/ui/loader'
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
      <div
        role="status"
        className="loader-reveal flex-1 flex flex-col items-center justify-center gap-5 min-h-screen"
      >
        <Loader />
        <p className="text-xs font-medium text-muted-foreground">Učitavanje…</p>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
