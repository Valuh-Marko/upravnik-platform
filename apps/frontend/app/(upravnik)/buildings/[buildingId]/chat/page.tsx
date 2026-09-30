export default async function BuildingChatPage({ params }: { params: Promise<{ buildingId: string }> }) {
  await params
  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Chat</h1>
      <div className="text-base text-muted-foreground text-center py-12">Stranica se gradi…</div>
    </div>
  )
}