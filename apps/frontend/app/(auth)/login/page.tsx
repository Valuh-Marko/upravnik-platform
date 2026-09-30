'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAxiosError } from 'axios'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    let authUser
    try {
      authUser = await login({ username, password })
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status
        if (status === 401 || status === 400) {
          setError('Pogrešno korisničko ime ili lozinka.')
        } else {
          setError('Greška na serveru. Pokušajte ponovo.')
        }
      } else {
        setError('Neočekivana greška. Pokušajte ponovo.')
      }
      setIsPending(false)
      return
    }

    // Navigate only after a confirmed successful login.
    // This is intentionally outside try/catch so that routing errors
    // are never shown as wrong-credential messages.
    router.push(authUser.accountType === 'UNIT_ACCOUNT' ? '/home' : '/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="pb-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            Profesionalni Upravnik
          </p>
          <CardTitle className="text-xl">Prijava</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Korisničko ime</Label>
              <Input
                id="username"
                type="text"
                placeholder="email ili broj stana"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Lozinka</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-base text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Prijavljivanje…' : 'Prijavi se'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
