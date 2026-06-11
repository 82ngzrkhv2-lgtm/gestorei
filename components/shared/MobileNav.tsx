'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import QuickAddModal from '@/components/transactions/QuickAddModal'
import { createClient } from '@/lib/supabase/client'

// ── Nav item definitions ─────────────────────────────────────
const LEFT_ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Histórico',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
]

const RIGHT_ITEMS = [
  {
    href: '/accounts',
    label: 'Núcleos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
]

// Drawer items removed for MVP

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setDrawerOpen(false)
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  // removed isDrawerActive for MVP

  return (
    <>
      {/* ── Bottom Navigation Bar ── */}
      <nav className="mobile-nav" id="mobile-nav" role="navigation" aria-label="Navegação principal">
        {/* Left items */}
        {LEFT_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item${active ? ' active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Center FAB — always visible, never clipped */}
        <div className="nav-fab-wrapper">
          <button
            className="nav-fab"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Nova movimentação"
            title="Nova movimentação"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Right items */}
        {RIGHT_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item${active ? ' active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Sign out and Menu items removed for MVP - moved to Sidebar and Profile */}
        <button
          onClick={handleSignOut}
          className={`mobile-nav-item`}
          aria-label="Sair da conta"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={{color: 'var(--accent-red)'}}>Sair</span>
        </button>
      </nav>

      {/* ── Quick Add Modal ── */}
      {quickAddOpen && (
        <QuickAddModal
          onClose={() => setQuickAddOpen(false)}
          onSuccess={() => { setQuickAddOpen(false); window.location.reload() }}
        />
      )}
    </>
  )
}
