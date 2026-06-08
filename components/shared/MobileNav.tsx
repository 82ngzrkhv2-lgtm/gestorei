'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import QuickAddModal from '@/components/transactions/QuickAddModal'

const ITEMS = [
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
  { href: '/limits', label: 'Limites', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )},
  { href: '/goals', label: 'Metas', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )},
  { href: '/accounts', label: 'Contas', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )},
]

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="mobile-nav" style={{ display: 'none' }} id="mobile-nav">
        {ITEMS.slice(0, 2).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div className="nav-fab-wrapper">
          <button className="nav-fab" onClick={() => setOpen(true)} title="Nova movimentação">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {ITEMS.slice(2, 5).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        <style>{`
          @media (max-width: 768px) {
            #mobile-nav { display: flex !important; }
          }
        `}</style>
      </nav>
      {open && <QuickAddModal onClose={() => setOpen(false)} onSuccess={() => { setOpen(false); window.location.reload(); }} />}
    </>
  )
}
