'use client'

import type { Notification } from '@/lib/hooks/use-notifications'

interface Props { notification: Notification; onClose: () => void }

export default function GoalMilestoneModal({ notification, onClose }: Props) {
  const { goalTitle, milestone, current, target } = notification.payload as { goalTitle: string; milestone: number; current: number; target: number }
  const isComplete = milestone === 100
  const color = isComplete ? '#10b981' : '#6366f1'
  const colorBg = isComplete ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)'
  const colorBorder = isComplete ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 600 }} />
      <div role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px,95vw)', background: 'var(--bg-card)', border: `1px solid ${colorBorder}`, borderRadius: 24, zIndex: 601, overflow: 'hidden', animation: 'popIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
        <div style={{ padding: '1.75rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: colorBg, border: `1.5px solid ${colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.875rem', margin: '0 auto 1.25rem' }}>
            {isComplete ? '🏆' : '🎯'}
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>{notification.title}</h2>
          <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{goalTitle}</p>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Acumulado</span>
              <span style={{ fontWeight: 700 }}>R${(current ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ height: '100%', width: `${milestone}%`, background: `linear-gradient(90deg, ${color}, ${color}90)`, borderRadius: 4, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <p style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 700, color, margin: 0 }}>
              {milestone}% de R${(target ?? 0).toFixed(2)}
            </p>
          </div>

          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', height: '3rem', borderRadius: 12 }}>
            {isComplete ? 'Uhuul! 🎉' : 'Continuar avançando'}
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity:0; transform:translate(-50%,calc(-50% + 16px)) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </>
  )
}
