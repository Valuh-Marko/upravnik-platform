import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

export default function SettingsPage() {
  return (
    <div className="pb-6">
      <PageHeader icon={<Settings />} title="Podešavanja" />
      <div className="text-base text-muted-foreground text-center py-12">Stranica se gradi…</div>
    </div>
  )
}
