import { MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

export default function ChatPage() {
  return (
    <div className="pb-6">
      <PageHeader icon={<MessageSquare />} tone="chat" title="Chat" description="Opšti chat zgrade" />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-base font-medium text-muted-foreground">Chat je u izradi</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Uskoro dostupno</p>
      </div>
    </div>
  )
}
