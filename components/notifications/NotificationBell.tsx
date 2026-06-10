'use client'

import { useNotifications } from '@/lib/hooks/use-notifications'
import { useState } from 'react'
import NotificationDrawer from './NotificationDrawer'

export default function NotificationBell() {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(true)}
        title="Notificações"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          border: '1px solid var(--glass-border)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>

        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4, right: -4,
            minWidth: 18, height: 18,
            background: '#ef4444',
            color: '#fff',
            borderRadius: 9,
            fontSize: '0.6875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg-base)',
            animation: 'badgePop 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer open={open} onClose={() => setOpen(false)} />

      <style>{`
        @keyframes badgePop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </>
  )
}
