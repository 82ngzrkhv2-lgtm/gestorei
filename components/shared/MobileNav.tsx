'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import QuickAddModal from '@/components/transactions/QuickAddModal'
import { createClient } from '@/lib/supabase/client'

const LEFT_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { href: '/transactions', label: 'Extrato', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  )},
]

const RIGHT_ITEMS = [
  { href: '/accounts', label: 'Contas', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )},
]

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    setDrawerOpen(false)
    router.push('/login')
    router.refresh()
  }

  // Helper to check if drawer links are active
  const isDrawerActive = pathname.startsWith('/categories') || pathname.startsWith('/limits') || pathname.startsWith('/goals') || pathname.startsWith('/alerts')

  return (
    <>
      <nav className="mobile-nav" style={{ display: 'none' }} id="mobile-nav">
        {/* Left Nav Items */}
        {LEFT_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* Center FAB */}
        <div className="nav-fab-wrapper">
          <button className="nav-fab" onClick={() => setOpen(true)} title="Nova movimentação">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Right Nav Items */}
        {RIGHT_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* More Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`mobile-nav-item ${isDrawerActive ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Mais
        </button>

        <style>{`
          @media (max-width: 768px) {
            #mobile-nav { display: flex !important; }
          }
        `}</style>
      </nav>

      {/* Quick Add Transaction Modal */}
      {open && (
        <QuickAddModal 
          onClose={() => setOpen(false)} 
          onSuccess={() => { setOpen(false); window.location.reload(); }} 
        />
      )}

      {/* Slide-out Side Drawer */}
      {drawerOpen && (
        <div 
          className="drawer-overlay animate-fade-in" 
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
          }}
        >
          <div 
            className="drawer-content animate-slide-left"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '280px',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-lg)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              zIndex: 1001,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>Ferramentas</span>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Menu List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <Link 
                href="/categories" 
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: pathname.startsWith('/categories') ? 'var(--accent)' : 'var(--text-primary)',
                  background: pathname.startsWith('/categories') ? 'var(--accent-glow)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  border: pathname.startsWith('/categories') ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                Categorias
              </Link>

              <Link 
                href="/limits" 
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: pathname.startsWith('/limits') ? 'var(--accent)' : 'var(--text-primary)',
                  background: pathname.startsWith('/limits') ? 'var(--accent-glow)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  border: pathname.startsWith('/limits') ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Limites
              </Link>

              <Link 
                href="/goals" 
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: pathname.startsWith('/goals') ? 'var(--accent)' : 'var(--text-primary)',
                  background: pathname.startsWith('/goals') ? 'var(--accent-glow)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  border: pathname.startsWith('/goals') ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
                Metas
              </Link>

              <Link 
                href="/alerts" 
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: pathname.startsWith('/alerts') ? 'var(--accent)' : 'var(--text-primary)',
                  background: pathname.startsWith('/alerts') ? 'var(--accent-glow)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  border: pathname.startsWith('/alerts') ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 0-3.46 0"/>
                </svg>
                Alertas
              </Link>
            </div>

            {/* Logout Footer */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: 'var(--accent-red)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
