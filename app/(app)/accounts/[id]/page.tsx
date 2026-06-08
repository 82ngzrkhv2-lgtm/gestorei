'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateFull, getMonthStart, getMonthEnd } from '@/lib/utils'
import type { Account, Transaction } from '@/types/database'
import QuickAddModal from '@/components/transactions/QuickAddModal'
import Link from 'next/link'

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [quickAdd, setQuickAdd] = useState(false)

  const load = useCallback(async () => {
    const [{ data: acc }, { data: txs }] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', id).single(),
      supabase.from('transactions').select('*, category:categories(name, color)').eq('account_id', id).order('date', { ascending: false }).limit(50),
    ])
    if (acc) setAccount(acc)
    if (txs) {
      const all = txs as unknown as Transaction[]
      setTransactions(all)
      const start = getMonthStart(); const end = getMonthEnd()
      const thisMonth = all.filter(t => t.date >= start && t.date <= end)
      setMonthIncome(thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))
      setMonthExpenses(thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))
    }
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)', margin: '2rem' }} />
  if (!account) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Conta não encontrada.</div>

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/accounts" className="btn btn-ghost btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${account.color}15`, border: `1px solid ${account.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: account.color }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.375rem' }}>{account.name}</h1>
              <p className="page-subtitle">{account.currency}</p>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setQuickAdd(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar
        </button>
      </div>

      {/* Stats */}
      <div className="account-stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-label">Saldo Atual</span>
          <span
            className="stat-value money-value"
            style={{
              color: Number(account.balance) >= 0 ? 'var(--accent)' : 'var(--accent-red)',
              marginTop: 8,
              display: 'block',
            }}
            title={formatCurrency(Number(account.balance), account.currency)}
          >
            {formatCurrency(Number(account.balance), account.currency)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Entradas do Mês</span>
          <span
            className="stat-value money-value"
            style={{ color: 'var(--accent)', marginTop: 8, display: 'block' }}
            title={formatCurrency(monthIncome)}
          >
            {formatCurrency(monthIncome)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Saídas do Mês</span>
          <span
            className="stat-value money-value"
            style={{ color: 'var(--accent-red)', marginTop: 8, display: 'block' }}
            title={formatCurrency(monthExpenses)}
          >
            {formatCurrency(monthExpenses)}
          </span>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="section-header">
          <span className="section-title">Histórico</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{transactions.length} movimentações</span>
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma movimentação nesta conta.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setQuickAdd(true)}>Adicionar primeira movimentação</button>
          </div>
        ) : (
          transactions.map((tx, i) => {
            const txAny = tx as any
            const category = txAny.category as { name: string; color: string } | null
            
            const isTransfer = tx.type === 'transfer'
            const isTransferInflow = isTransfer && tx.destination_account_id === id
            const isTransferOutflow = isTransfer && tx.source_account_id === id
            const isIncome = tx.type === 'income' || isTransferInflow

            const iconBg = isTransfer 
              ? 'rgba(59, 130, 246, 0.1)' 
              : isIncome 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)'

            const iconColor = isTransfer 
              ? 'var(--accent-blue)' 
              : isIncome 
                ? 'var(--accent)' 
                : 'var(--accent-red)'

            const amountColor = isIncome 
              ? 'var(--accent)' 
              : isTransfer 
                ? 'var(--text-secondary)' 
                : 'var(--accent-red)'

            return (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 0', borderBottom: i < transactions.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                  {isTransfer ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3L21 7L17 11"/><path d="M21 7H9"/><path d="M7 21L3 17L7 13"/><path d="M3 17H15"/></svg>
                  ) : isIncome ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{tx.description || category?.name || (isTransfer ? 'Transferência' : isIncome ? 'Entrada' : 'Saída')}</p>
                  <p style={{ fontSize: '0.75rem', color: isTransfer ? 'var(--accent-blue)' : (category?.color ?? 'var(--text-secondary)'), marginTop: '0.125rem', fontWeight: 500 }}>
                    {isTransfer ? 'Movimentação interna' : (category?.name ?? '—')}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ fontWeight: 700, color: amountColor, fontSize: '1rem' }}>
                    {isIncome ? '+' : '-'}{formatCurrency(Number(tx.amount), account.currency)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{formatDateFull(tx.date)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} onSuccess={load} defaultAccountId={id} />}
    </div>
  )
}
