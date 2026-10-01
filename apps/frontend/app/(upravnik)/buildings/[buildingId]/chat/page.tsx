import { MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

export default async function BuildingChatPage({ params }: { params: Promise<{ buildingId: string }> }) {
  await params
  return (
    <div className="pb-6">
      <PageHeader icon={<MessageSquare />} tone="chat" title="Chat" />
      <div className="text-base text-muted-foreground text-center py-12">Stranica se gradi…</div>
    </div>
  )
}