import { AppSidebar } from '@/components/AppSidebar'
import { AppBottomNav } from '@/components/AppBottomNav'
import { RightPanel } from '@/components/RightPanel'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-full max-w-[1366px] mx-auto md:px-3 grid grid-cols-1 md:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px] gap-x-6">
        <AppSidebar />
        <main className="min-h-0 md:py-3">
          <div data-page-scroll className="h-full overflow-y-auto pb-16 md:pb-0 px-4 md:px-5 md:bg-[var(--surface-well)] md:border md:border-[var(--border)] md:rounded-[var(--radius-lg)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {children}
          </div>
        </main>
        <RightPanel />
      </div>
      <AppBottomNav />
    </div>
  )
}
