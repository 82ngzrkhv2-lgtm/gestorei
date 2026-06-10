'use client'

import type { Notification } from '@/lib/hooks/use-notifications'

interface Props { notification: Notification; onClose: () => void }

export default function SpendingAlertModal({ notification, onClose }: Props) {
  const { todaySpending, dailyAvg, pctAbove } = notification.payload as { todaySpending: number; dailyAvg: number; pctAbove: number }
  const isSevere = pctAbove >= 100

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 600 }} />
      <div role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px,95vw)', background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 24, zIndex: 601, overflow: 'hidden', animation: 'popIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ height: 4, background: '#ef4444' }} />
        <div style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {isSevere ? '🚨' : '📉'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Gasto acima do normal</h2>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--accent-red)' }}>+{pctAbove}% acima da sua média</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hoje</p>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>R${(todaySpending ?? 0).toFixed(2)}</p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '1rem' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Média diária</p>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>R${(dailyAvg ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {notification.message}
          </p>

          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', height: '3rem', borderRadius: 12 }}>
            Estou ciente
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity:0; transform:translate(-50%,calc(-50% + 16px)) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </>
  )
}
