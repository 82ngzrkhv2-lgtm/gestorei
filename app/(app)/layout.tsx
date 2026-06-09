import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/shared/Sidebar'
import MobileNav from '@/components/shared/MobileNav'
import SummaryPopupProvider from '@/components/shared/SummaryPopupProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <main className="main-content">
        {children}
      </main>
      <MobileNav />
      {/* In-app financial summary pop-up (client-side, non-blocking) */}
      <SummaryPopupProvider />
    </div>
  )
}
