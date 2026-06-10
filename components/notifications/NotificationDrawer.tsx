'use client'

import { useEffect, useState } from 'react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import type { Notification } from '@/lib/hooks/use-notifications'
import NotificationContentRenderer from './NotificationContentRenderer'

interface Props {
  open: boolean
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)   return 'agora'
  if (mins < 60)  return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days}d`
}

const TYPE_ICONS: Record<string, string> = {
  daily_ready:    '📊',
  weekly_ready:   '📈',
  monthly_ready:  '🏆',
  limit_alert:    '⚠️',
  goal_milestone: '🎯',
  spending_spike: '📉',
  income_above_avg: '💹',
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const { notifications, unreadCount, loading, hasMore, loadMore, markAsRead, markAllAsRead, refresh } = useNotifications()
  const [activeNotif, setActiveNotif] = useState<Notification | null>(null)

  // Refresh on open
  useEffect(() => { if (open) refresh() }, [open]) // eslint-disable-line

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleItemClick(notif: Notification) {
    if (!notif.read) markAsRead(notif.id)
    setActiveNotif(notif)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 500,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-label="Notificações"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(400px, 95vw)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 501,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '-32px 0 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Notificações</h2>
            {unreadCount > 0 && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 8, border: '1px solid var(--glass-border)',
                  background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Marcar todas
              </button>
            )}
            <button
              id="notification-drawer-close"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--glass-border)',
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {loading && notifications.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
                Nenhuma notificação ainda.
              </p>
            </div>
          )}

          {notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', gap: '0.875rem',
                alignItems: 'flex-start', padding: '0.875rem 1.5rem',
                background: notif.read ? 'transparent' : 'rgba(16,185,129,0.04)',
                borderLeft: notif.read ? '3px solid transparent' : '3px solid var(--accent)',
                border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--glass-border)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(16,185,129,0.04)')}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: 2 }}>
                {TYPE_ICONS[notif.type] ?? '🔔'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: '0 0 0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: notif.read ? 500 : 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {notif.title}
                </p>
                <p style={{
                  margin: '0 0 0.375rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}>
                  {notif.message}
                </p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  {timeAgo(notif.created_at)}
                </p>
              </div>
              {!notif.read && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent)', flexShrink: 0, marginTop: 6,
                }} />
              )}
            </button>
          ))}

          {hasMore && (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <button onClick={loadMore} disabled={loading} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                {loading ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Modal Renderer */}
      {activeNotif && (
        <NotificationContentRenderer
          notification={activeNotif}
          onClose={() => setActiveNotif(null)}
        />
      )}
    </>
  )
}
