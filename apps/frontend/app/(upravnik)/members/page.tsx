import { Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

export default function MembersPage() {
  return (
    <div className="pb-6">
      <PageHeader icon={<Users />} title="Stanari" description="Pregled stanara po zgradama" />
      <div className="text-base text-muted-foreground text-center py-12">Stranica se gradi…</div>
    </div>
  )
}
