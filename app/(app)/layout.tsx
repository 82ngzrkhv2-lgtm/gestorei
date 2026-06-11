import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/shared/Sidebar'
import MobileNav from '@/components/shared/MobileNav'
import MobileHeader from '@/components/shared/MobileHeader'
import ConsentGuard from '@/components/shared/ConsentGuard'
import { PrivacyProvider } from '@/lib/contexts/PrivacyContext'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <ConsentGuard>
      <PrivacyProvider>
        <div className="app-layout">
          <Sidebar user={user} />
          <main className="main-content">
            <MobileHeader />
            {children}
          </main>
          <MobileNav />
          {/* SummaryPopup removed for MVP */}
        </div>
      </PrivacyProvider>
    </ConsentGuard>
  )
}
