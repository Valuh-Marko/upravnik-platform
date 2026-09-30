import { AppShell } from '@/components/AppShell'
import { AuthGuard } from '@/components/guards/AuthGuard'

export default function UpravnikLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredAccountType="SYSTEM_USER" redirectTo="/home">
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
