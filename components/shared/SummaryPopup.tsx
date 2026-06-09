'use client'

/**
 * SummaryPopup
 *
 * Premium in-app modal that displays financial summary notifications.
 * Shown automatically when the user opens the app and has an unread summary.
 * Supports daily, weekly, and monthly summary types.
 */
import { useEffect, useRef } from 'react'
import type {
  SummaryPayload,
  DailySummaryPayload,
  WeeklySummaryPayload,
  MonthlySummaryPayload,
  SummaryItem,
} from '@/lib/notification-engine'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  daily: {
    icon: '📊',
    label: 'Resumo Diário',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.12)',
    colorBorder: 'rgba(16,185,129,0.25)',
  },
  weekly: {
    icon: '📈',
    label: 'Resumo Semanal',
    color: '#6366f1',
    colorBg: 'rgba(99,102,241,0.12)',
    colorBorder: 'rgba(99,102,241,0.25)',
  },
  monthly: {
    icon: '🏆',
    label: 'Fechamento Mensal',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.12)',
    colorBorder: 'rgba(245,158,11,0.25)',
  },
} as const

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ item }: { item: SummaryItem }) {
  const valueColor =
    item.positive === true
      ? '#10b981'
      : item.positive === false
        ? '#ef4444'
        : 'var(--text-primary)'

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: '0.875rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        flex: '1 1 calc(33% - 0.5rem)',
        minWidth: 100,
      }}
    >
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {item.label}
      </span>
      <span
        style={{
          fontSize: '1.0625rem',
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.2,
        }}
      >
        {item.value}
      </span>
    </div>
  )
}

function HealthBadge({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.875rem',
        background: `${color}18`,
        border: `1px solid ${color}35`,
        borderRadius: 20,
        fontSize: '0.8125rem',
        fontWeight: 600,
        color,
        width: 'fit-content',
      }}
    >
      {emoji}
      <span>Saúde financeira: {label}</span>
    </div>
  )
}

function InsightList({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {insights.map((insight, i) => (
        <p
          key={i}
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            paddingLeft: '0.25rem',
          }}
        >
          {insight}
        </p>
      ))}
    </div>
  )
}

function GoalBar({ title, progress }: { title: string; progress: number }) {
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const color = clampedProgress >= 80 ? '#10b981' : clampedProgress >= 50 ? '#f59e0b' : '#6366f1'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          🎯 {title}
        </span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color }}>{clampedProgress}%</span>
      </div>
      <div
        style={{
          height: 5,
          background: 'var(--bg-elevated)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clampedProgress}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Content by type ──────────────────────────────────────────────────────────

function DailyContent({ payload }: { payload: DailySummaryPayload }) {
  return (
    <>
      {/* Metrics */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {payload.items.map((item, i) => <MetricCard key={i} item={item} />)}
      </div>

      {/* Top expense / top account */}
      {(payload.topExpense || payload.topAccount) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            padding: '0.875rem 1rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
          }}
        >
          {payload.topExpense && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              💸 Maior gasto: <strong style={{ color: 'var(--text-primary)' }}>{payload.topExpense.name}</strong>{' '}
              — {payload.topExpense.amount}
            </p>
          )}
          {payload.topAccount && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              🏦 Núcleo mais movimentado: <strong style={{ color: 'var(--text-primary)' }}>{payload.topAccount.name}</strong>
            </p>
          )}
        </div>
      )}

      {/* Health */}
      <HealthBadge
        emoji={payload.health.emoji}
        label={payload.health.label}
        color={payload.health.color === 'green' ? '#10b981' : payload.health.color === 'yellow' ? '#f59e0b' : '#ef4444'}
      />

      {/* Insights */}
      <InsightList insights={payload.insights} />

      {/* Goals */}
      {payload.goals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {payload.goals.map((g, i) => <GoalBar key={i} title={g.title} progress={g.progress} />)}
        </div>
      )}
    </>
  )
}

function WeeklyContent({ payload }: { payload: WeeklySummaryPayload }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {payload.items.map((item, i) => <MetricCard key={i} item={item} />)}
      </div>

      {(payload.topCategory || payload.topExpense) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            padding: '0.875rem 1rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
          }}
        >
          {payload.topCategory && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              💸 Categoria mais cara: <strong style={{ color: 'var(--text-primary)' }}>{payload.topCategory.name}</strong>{' '}
              — {payload.topCategory.amount}
            </p>
          )}
          {payload.topExpense && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              📋 Maior transação: <strong style={{ color: 'var(--text-primary)' }}>{payload.topExpense.name}</strong>{' '}
              — {payload.topExpense.amount}
            </p>
          )}
        </div>
      )}

      <HealthBadge
        emoji={payload.health.emoji}
        label={payload.health.label}
        color={payload.health.color === 'green' ? '#10b981' : payload.health.color === 'yellow' ? '#f59e0b' : '#ef4444'}
      />

      <InsightList insights={payload.insights} />

      {payload.goals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {payload.goals.map((g, i) => <GoalBar key={i} title={g.title} progress={g.progress} />)}
        </div>
      )}
    </>
  )
}

function MonthlyContent({ payload }: { payload: MonthlySummaryPayload }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {payload.items.map((item, i) => <MetricCard key={i} item={item} />)}
      </div>

      {(payload.topAccount || payload.topExpense) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            padding: '0.875rem 1rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
          }}
        >
          {payload.topAccount && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              🏆 Melhor núcleo: <strong style={{ color: 'var(--text-primary)' }}>{payload.topAccount.name}</strong>
            </p>
          )}
          {payload.topExpense && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              💸 Maior categoria de gasto: <strong style={{ color: 'var(--text-primary)' }}>{payload.topExpense.name}</strong>{' '}
              — {payload.topExpense.amount}
            </p>
          )}
          {payload.goalsCompleted > 0 && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>
              🎯 Metas concluídas: {payload.goalsCompleted}/{payload.goalsTotal}
            </p>
          )}
          {payload.limitsExceeded.length > 0 && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444', fontWeight: 600 }}>
              ⚠️ Limites ultrapassados: {payload.limitsExceeded.length}
            </p>
          )}
        </div>
      )}

      <HealthBadge
        emoji={payload.health.emoji}
        label={payload.health.label}
        color={payload.health.color === 'green' ? '#10b981' : payload.health.color === 'yellow' ? '#f59e0b' : '#ef4444'}
      />

      <InsightList insights={payload.insights} />

      {payload.goals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {payload.goals.map((g, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <GoalBar title={g.title} progress={g.progress} />
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '0.25rem' }}>
                {g.current} de {g.target}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SummaryPopupProps {
  summaryId: string
  type: 'daily' | 'weekly' | 'monthly'
  periodLabel: string
  payload: SummaryPayload
  onDismiss: () => void
}

export default function SummaryPopup({
  type,
  periodLabel,
  payload,
  onDismiss,
}: SummaryPopupProps) {
  const config = TYPE_CONFIG[type]
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDismiss])

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        ref={overlayRef}
        onClick={onDismiss}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 600,
          animation: 'fadeIn 0.2s ease both',
        }}
      />

      {/* ── Modal ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${config.label} — ${periodLabel}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(600px, 95vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: `1px solid ${config.colorBorder}`,
          borderRadius: 24,
          boxShadow: `0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px ${config.colorBorder}`,
          zIndex: 601,
          animation: 'summaryPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
          overflow: 'hidden',
        }}
      >
        {/* ── Gradient accent top bar ── */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${config.color}, ${config.color}80)`,
            flexShrink: 0,
          }}
        />

        {/* ── Scrollable content area ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.75rem 1.75rem 0' }}>

          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1.5rem',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {/* Icon badge */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: config.colorBg,
                  border: `1.5px solid ${config.colorBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.625rem',
                  flexShrink: 0,
                  boxShadow: `0 0 24px ${config.color}25`,
                }}
              >
                {config.icon}
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                  }}
                >
                  {config.label}
                </h2>
                <p
                  style={{
                    margin: '0.2rem 0 0',
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  {periodLabel}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              id="summary-popup-close-btn"
              onClick={onDismiss}
              aria-label="Fechar resumo"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--glass-border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Type-specific content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {type === 'daily' && <DailyContent payload={payload as DailySummaryPayload} />}
            {type === 'weekly' && <WeeklyContent payload={payload as WeeklySummaryPayload} />}
            {type === 'monthly' && <MonthlyContent payload={payload as MonthlySummaryPayload} />}
          </div>

          {/* Spacer before sticky footer */}
          <div style={{ height: '1.75rem' }} />
        </div>

        {/* ── Sticky footer ── */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid var(--glass-border)',
            background: 'var(--bg-card)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <button
            id="summary-popup-dismiss-btn"
            onClick={onDismiss}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: 10,
              border: `1px solid ${config.colorBorder}`,
              background: config.colorBg,
              color: config.color,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
              fontFamily: 'inherit',
            } as React.CSSProperties}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            Entendido
          </button>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes summaryPopIn {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 20px)) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
