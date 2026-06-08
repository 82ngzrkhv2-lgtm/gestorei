import type { Transaction } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  transactions: Transaction[]
  onAdd: () => void
}

export default function RecentTransactions({ transactions, onAdd }: Props) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      <div className="section-header" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 4, height: 16, background: 'var(--accent)', borderRadius: 4 }} />
          <span className="section-title">Últimas Movimentações</span>
        </div>
        <Link href="/transactions" style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          Ver histórico completo
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
              <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nenhuma movimentação registrada.</p>
          <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
            Registrar primeira movimentação
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {transactions.map((tx, i) => {
            const txAny = tx as unknown as Record<string, unknown>
            const account = txAny.account as { name: string; color: string; icon: string } | null
            const category = txAny.category as { name: string; color: string } | null
            const isIncome = tx.type === 'income'
            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.875rem 0',
                borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s',
                margin: '0 -0.5rem',
                paddingLeft: '0.5rem', paddingRight: '0.5rem',
                borderRadius: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Type indicator */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${isIncome ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isIncome ? 'var(--accent)' : 'var(--accent-red)',
                }}>
                  {isIncome ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                    {tx.description || category?.name || (isIncome ? 'Entrada' : 'Saída')}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                    {account && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: account.color }} />
                        {account.name}
                      </span>
                    )}
                    {category && (
                      <>
                        <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>|</span>
                        <span style={{ fontSize: '0.75rem', color: category.color, fontWeight: 500 }}>{category.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount + Date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: isIncome ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {isIncome ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>
                    {formatDate(tx.date)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
