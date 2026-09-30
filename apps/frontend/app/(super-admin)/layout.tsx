import { AppShell } from '@/components/AppShell'
import { AuthGuard } from '@/components/guards/AuthGuard'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredAccountType="SYSTEM_USER" requiredRoles={['SUPER_ADMIN']} redirectTo="/dashboard">
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
