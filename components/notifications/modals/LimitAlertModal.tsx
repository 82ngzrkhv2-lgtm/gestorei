'use client'

import type { Notification } from '@/lib/hooks/use-notifications'

interface Props { notification: Notification; onClose: () => void }

export default function LimitAlertModal({ notification, onClose }: Props) {
  const { limitName, pct, spent, budget } = notification.payload as { limitName: string; pct: number; spent: number; budget: number }
  const isOver = pct >= 100
  const color  = isOver ? '#ef4444' : '#f59e0b'
  const colorBg = isOver ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'
  const colorBorder = isOver ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 600 }} />
      <div role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px,95vw)', background: 'var(--bg-card)', border: `1px solid ${colorBorder}`, borderRadius: 24, zIndex: 601, overflow: 'hidden', animation: 'popIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ height: 4, background: color }} />
        <div style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: colorBg, border: `1.5px solid ${colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {isOver ? '🚨' : '⚡'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{notification.title}</h2>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Limite: {limitName}</p>
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Gasto atual</span>
              <span style={{ fontWeight: 700, color }}> R${(spent ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Orçamento</span>
              <span style={{ fontWeight: 700 }}>R${(budget ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <p style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 700, color, margin: '0.5rem 0 0' }}>{pct}% utilizado</p>
          </div>

          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', height: '3rem', borderRadius: 12 }}>
            Entendido
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity:0; transform:translate(-50%,calc(-50% + 16px)) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </>
  )
}
