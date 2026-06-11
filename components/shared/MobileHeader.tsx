'use client'

import React from 'react'
import Logo from './Logo'
import { usePrivacy } from '@/lib/contexts/PrivacyContext'
import dynamic from 'next/dynamic'

const NotificationBell = dynamic(() => import('@/components/notifications/NotificationBell'), { ssr: false })

export default function MobileHeader() {
  const { isPrivate, togglePrivacy } = usePrivacy()

  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Logo size={28} />
        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Gestorei</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          onClick={togglePrivacy}
          className="btn btn-ghost btn-icon"
          style={{ width: 32, height: 32 }}
          title={isPrivate ? "Mostrar valores" : "Ocultar valores"}
        >
          {isPrivate ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
        <NotificationBell />
      </div>

      <style>{`
        .mobile-header {
          display: none;
        }

        @media (max-width: 640px) {
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            background: var(--bg-base);
            position: sticky;
            top: 0;
            z-index: 40;
            border-bottom: 1px solid var(--border);
          }
        }
      `}</style>
    </header>
  )
}
