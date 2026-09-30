'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthUser, LoginDto, MeResponse } from '@/lib/types'
import { authApi } from '@/lib/api/auth'

function meToUser(me: MeResponse): AuthUser {
  return {
    id: me.id,
    username: me.username,
    accountType: me.accountType,
    role: me.systemRole ?? me.buildingMembers?.[0]?.role,
    firstName: me.firstName,
    lastName: me.lastName,
    email: me.email,
    phone: me.phone,
  }
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (dto: LoginDto) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authApi
        .me()
        .then((me) => {
          setUser(meToUser(me))
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false))
    } else {
      queueMicrotask(() => setIsLoading(false))
    }
  }, [])

  const login = useCallback(async (dto: LoginDto): Promise<AuthUser> => {
    const { accessToken } = await authApi.login(dto)
    localStorage.setItem('token', accessToken)
    const me = await authApi.me()
    const user = meToUser(me)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    queryClient.clear()
    router.push('/login')
  }, [router, queryClient])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
