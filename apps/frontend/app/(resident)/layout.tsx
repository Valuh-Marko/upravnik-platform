import { AppShell } from '@/components/AppShell'
import { AuthGuard } from '@/components/guards/AuthGuard'

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
