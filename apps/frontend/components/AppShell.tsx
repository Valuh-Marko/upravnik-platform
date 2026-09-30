import { AppSidebar } from '@/components/AppSidebar'
import { AppBottomNav } from '@/components/AppBottomNav'
import { RightPanel } from '@/components/RightPanel'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-full max-w-[1366px] mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px] gap-x-6">
        <AppSidebar />
        <main className="overflow-y-auto pb-16 md:pb-0 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </main>
        <RightPanel />
      </div>
      <AppBottomNav />
    </div>
  )
}
