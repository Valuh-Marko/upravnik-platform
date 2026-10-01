import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

export default function DocumentsPage() {
  return (
    <div className="pb-6">
      <PageHeader icon={<FileText />} tone="docs" title="Dokumenta" description="Dokumenti i fajlovi zgrade" />
      <div className="text-base text-muted-foreground text-center py-12">Stranica se gradi…</div>
    </div>
  )
}
