import type { Account } from '@/types/database'
import { formatCurrency, getAccountTypeLabel } from '@/lib/utils'
import Link from 'next/link'

const ICONS: Record<string, React.ReactNode> = {
  wallet:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  user:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  briefcase:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  'piggy-bank':<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7V4a1 1 0 00-1-1H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2a1 1 0 00-1-1"/><path d="M3 11V5"/></svg>,
  'trending-up':<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
}

export default function AccountSummaryCard({ account }: { account: Account }) {
  const balance = Number(account.balance)
  const isNegative = balance < 0

  return (
    <Link href={`/accounts/${account.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 0.875rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.borderColor = `${account.color}40`
          el.style.background = `${account.color}08`
          el.style.transform = 'translateX(2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.borderColor = 'var(--glass-border)'
          el.style.background = 'var(--bg-elevated)'
          el.style.transform = 'translateX(0)'
        }}
      >
        {/* Color strip */}
        <div style={{ width: 3, height: 32, borderRadius: 99, background: account.color, flexShrink: 0 }} />

        {/* Icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${account.color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: account.color,
        }}>
          {ICONS[account.icon] ?? ICONS.wallet}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {account.name}
          </p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 1 }}>
            {getAccountTypeLabel(account.type)}
          </p>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p className="money-value" style={{
            fontWeight: 700, fontSize: '0.9rem',
            color: isNegative ? 'var(--accent-red)' : 'var(--text-primary)',
          }}>
            {formatCurrency(balance, account.currency)}
          </p>
        </div>
      </div>
    </Link>
  )
}
