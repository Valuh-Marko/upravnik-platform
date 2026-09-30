import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Chat</h1>
      <p className="text-base text-muted-foreground mb-6">Opšti chat zgrade</p>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-base font-medium text-muted-foreground">Chat je u izradi</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Uskoro dostupno</p>
      </div>
    </div>
  )
}
