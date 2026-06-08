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
    label: 'Extrato',
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
    label: 'Contas',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
]

const DRAWER_ITEMS = [
  {
    href: '/categories',
    label: 'Categorias',
    description: 'Organize seus lançamentos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    color: 'var(--accent-amber)',
  },
  {
    href: '/limits',
    label: 'Limites',
    description: 'Controle de gastos mensais',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: 'var(--accent-red)',
  },
  {
    href: '/goals',
    label: 'Metas',
    description: 'Seus objetivos financeiros',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    color: 'var(--accent-blue)',
  },
  {
    href: '/alerts',
    label: 'Alertas',
    description: 'Notificações e avisos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 0-3.46 0" />
      </svg>
    ),
    color: 'var(--accent)',
  },
  {
    href: '/settings',
    label: 'Notificações',
    description: 'Resumos automáticos no WhatsApp',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.7A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
      </svg>
    ),
    color: '#25D366',
  },
]

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setDrawerOpen(false)
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  const isDrawerActive = DRAWER_ITEMS.some(item => pathname.startsWith(item.href))

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

        {/* More button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`mobile-nav-item${isDrawerActive ? ' active' : ''}`}
          aria-label="Mais opções"
          aria-expanded={drawerOpen}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5"  cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span>Mais</span>
        </button>
      </nav>

      {/* ── Quick Add Modal ── */}
      {quickAddOpen && (
        <QuickAddModal
          onClose={() => setQuickAddOpen(false)}
          onSuccess={() => { setQuickAddOpen(false); window.location.reload() }}
        />
      )}

      {/* ── Side Drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 200,
              animation: 'fadeIn 0.2s ease both',
            }}
          />

          {/* Drawer panel — slides in from right */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de ferramentas"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(300px, 85vw)',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              /* Safe area aware */
              paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              animation: 'slideLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 1.25rem 1rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '0.5rem',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: 32, height: 32,
                  background: 'var(--accent)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>Ferramentas</span>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Menu items */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              padding: '0 0.75rem',
            }}>
              {DRAWER_ITEMS.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.875rem 0.875rem',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: active ? item.color : 'var(--text-primary)',
                      background: active ? `${item.color}12` : 'transparent',
                      border: active ? `1px solid ${item.color}25` : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      minHeight: 'var(--tap-min)',
                    }}
                  >
                    {/* Icon container */}
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 10,
                      background: `${item.color}15`,
                      border: `1px solid ${item.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: item.color, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: active ? item.color : 'var(--text-primary)',
                        marginBottom: 1,
                      }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                )
              })}
            </div>

            {/* Footer — Sign out */}
            <div style={{ padding: '0 0.75rem', flexShrink: 0, marginTop: 'auto', paddingTop: '1rem' }}>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: '0.75rem' }} />
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 0.875rem',
                  borderRadius: 10,
                  color: 'var(--accent-red)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'background 0.15s ease',
                  minHeight: 'var(--tap-min)',
                }}
              >
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                Sair da Conta
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
