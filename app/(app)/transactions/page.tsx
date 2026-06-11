'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateFull } from '@/lib/utils'
import type { Transaction, Account, Category } from '@/types/database'
import QuickAddModal from '@/components/transactions/QuickAddModal'
import { COPY } from '@/lib/copy'

export default function TransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [quickAdd, setQuickAdd] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    let q = supabase
      .from('transactions')
      .select('id, amount, date, description, type, transfer_group_id, account_id, source_account_id, destination_account_id, account:accounts!account_id(name,color), category:categories(name,color)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterType !== 'all') q = q.eq('type', filterType)
    if (filterAccount) q = q.eq('account_id', filterAccount)
    if (filterCategory) q = q.eq('category_id', filterCategory)
    if (filterDateFrom) q = q.gte('date', filterDateFrom)
    if (filterDateTo) q = q.lte('date', filterDateTo)

    const [{ data: txs }, { data: accs }, { data: cats }] = await Promise.all([
      q,
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').order('name'),
    ])

    if (txs) setTransactions(txs as unknown as Transaction[])
    if (accs) setAccounts(accs)
    if (cats) setCategories(cats)
    setLoading(false)
  }, [supabase, filterType, filterAccount, filterCategory, filterDateFrom, filterDateTo])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? transactions.filter(t => t.description?.toLowerCase().includes(search.toLowerCase()))
    : transactions

  // Only calculate income and expenses (transfers are neutral)
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  async function deleteTransaction(tx: Transaction) {
    if (!confirm('Excluir esta movimentação permanentemente?')) return
    setLoading(true)

    try {
      if (tx.type === 'transfer' && tx.transfer_group_id) {
        // Fetch both transactions in the transfer group
        const { data: groupTxs } = await supabase
          .from('transactions')
          .select('*')
          .eq('transfer_group_id', tx.transfer_group_id)

        if (groupTxs && groupTxs.length === 2) {
          // Delete both transactions
          await supabase.from('transactions').delete().eq('transfer_group_id', tx.transfer_group_id)

          // Find source and destination legs
          const sourceLeg = groupTxs.find(t => t.account_id === t.source_account_id)
          const destLeg = groupTxs.find(t => t.account_id === t.destination_account_id)

          if (sourceLeg && destLeg) {
            const [{ data: sourceAcc }, { data: destAcc }] = await Promise.all([
              supabase.from('accounts').select('*').eq('id', sourceLeg.source_account_id).single(),
              supabase.from('accounts').select('*').eq('id', destLeg.destination_account_id).single(),
            ])

            // Restore balances: add back to source, subtract from destination
            const updates = []
            if (sourceAcc) {
              updates.push(
                supabase.from('accounts').update({
                  balance: Number(sourceAcc.balance) + Number(sourceLeg.amount),
                  updated_at: new Date().toISOString()
                }).eq('id', sourceAcc.id)
              )
            }
            if (destAcc) {
              updates.push(
                supabase.from('accounts').update({
                  balance: Number(destAcc.balance) - Number(destLeg.amount),
                  updated_at: new Date().toISOString()
                }).eq('id', destAcc.id)
              )
            }
            await Promise.all(updates)
          }
        } else {
          // Fallback: delete only this transaction
          await supabase.from('transactions').delete().eq('id', tx.id)
        }
      } else {
        // Normal transaction delete
        await supabase.from('transactions').delete().eq('id', tx.id)
        const account = accounts.find(a => a.id === tx.account_id)
        if (account) {
          const delta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount)
          await supabase.from('accounts').update({
            balance: Number(account.balance) + delta,
            updated_at: new Date().toISOString()
          }).eq('id', tx.account_id)
        }
      }
    } catch (err) {
      console.error('Error deleting transaction:', err)
      alert('Erro ao excluir movimentação.')
    } finally {
      setLoading(false)
      load()
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="page-subtitle">Histórico completo de movimentações</p>
        </div>
        <button id="add-transaction-btn" className="btn btn-primary" onClick={() => setQuickAdd(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        {/* Search — always full width */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="input-label" htmlFor="tx-search">Busca</label>
          <input
            id="tx-search"
            className="input"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Filter grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
          gap: '0.75rem',
        }}>
          <div>
            <label className="input-label" htmlFor="tx-type">Exibir</label>
            <select id="tx-type" className="input" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">Tudo</option>
              <option value="income">Apenas Entradas</option>
              <option value="expense">Apenas Saídas</option>
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="tx-account">Núcleo</label>
            <select id="tx-account" className="input" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
              <option value="">Todos</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-stats" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Entradas</span>
          <span
            className="stat-value money-value"
            style={{ color: 'var(--accent)', marginTop: 4, display: 'block' }}
            title={formatCurrency(totalIncome)}
          >
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Saídas</span>
          <span
            className="stat-value money-value"
            style={{ color: 'var(--accent-red)', marginTop: 4, display: 'block' }}
            title={formatCurrency(totalExpenses)}
          >
            {formatCurrency(totalExpenses)}
          </span>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-elevated)' }}>
          <span className="stat-label">Resultado</span>
          <span
            className="stat-value money-value"
            style={{ color: totalIncome - totalExpenses >= 0 ? 'var(--text-primary)' : 'var(--accent-red)', marginTop: 4, display: 'block' }}
            title={formatCurrency(totalIncome - totalExpenses)}
          >
            {formatCurrency(totalIncome - totalExpenses)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Movimentações</span>
          <span className="stat-value" style={{ color: 'var(--text-primary)', marginTop: 4, display: 'block', fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ 
            padding: '4rem 1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            textAlign: 'center',
            marginTop: '1rem'
          }}>
            <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <p style={{ fontSize: '1.0625rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {COPY.transactions.empty_title}
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {COPY.transactions.empty_subtitle}
            </p>
            <button className="btn btn-secondary" onClick={() => setQuickAdd(true)}>{COPY.actions.new_transaction}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Object.entries(
              filtered.reduce((acc, tx) => {
                if (!acc[tx.date]) acc[tx.date] = []
                acc[tx.date].push(tx)
                return acc
              }, {} as Record<string, typeof filtered>)
            )
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
            .map(([date, dayTxs]) => (
              <div key={date} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '0.5rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {formatDateFull(date)}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {dayTxs.map((tx, i) => {
                    const txAny = tx as any
                    const account = txAny.account
                    const category = txAny.category
                    
                    const isTransfer = tx.type === 'transfer'
                    const isTransferInflow = isTransfer && tx.account_id === tx.destination_account_id
                    const isIncome = tx.type === 'income' || isTransferInflow

                    const amountColor = isIncome ? 'var(--text-primary)' : isTransfer ? 'var(--text-secondary)' : 'var(--text-primary)'
                    const amountPrefix = isIncome ? '+' : '-'
                    const iconBg = 'var(--bg-elevated)'
                    const iconBorder = 'var(--border)'
                    const iconColor = 'var(--text-primary)'

                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 2vw, 1.25rem)',
                          padding: 'clamp(0.875rem, 2vw, 1.125rem) clamp(0.875rem, 2.5vw, 1.5rem)',
                          borderBottom: i < dayTxs.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.2s', minHeight: '64px',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                      >
                        {/* Type icon */}
                        <div style={{
                          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                          background: iconBg, border: `1px solid ${iconBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor,
                        }}>
                          {isTransfer ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3L21 7L17 11"/><path d="M21 7H9"/><path d="M7 21L3 17L7 13"/><path d="M3 17H15"/></svg>
                          ) : isIncome ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>
                          )}
                        </div>

                        {/* Description + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3,
                          }}>
                            {tx.description || category?.name || (isTransfer ? 'Transferência' : isIncome ? 'Entrada' : 'Saída')}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: 3 }}>
                            {account && (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: account.color, flexShrink: 0 }} />
                                {account.name}
                              </span>
                            )}
                            {category && (
                              <span style={{ fontSize: 'var(--text-xs)', color: category.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {category.name}
                              </span>
                            )}
                            {isTransfer && (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-blue)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                Interna
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 2, minWidth: 0 }}>
                          <p className="money-value" style={{ fontWeight: 700, fontSize: 'var(--text-money-sm)', color: amountColor, whiteSpace: 'nowrap' }}>
                            {amountPrefix}{formatCurrency(Number(tx.amount))}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => deleteTransaction(tx)}
                          className="btn btn-ghost btn-icon"
                          title="Excluir movimentação"
                          aria-label="Excluir movimentação"
                          style={{ opacity: 0.6, flexShrink: 0 }}
                          disabled={loading}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} onSuccess={load} />}
    </div>
  )
}
