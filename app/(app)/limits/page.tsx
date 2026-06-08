'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getMonthStart, getMonthEnd } from '@/lib/utils'
import type { FinancialLimit, Account, Category } from '@/types/database'

export default function LimitsPage() {
  const supabase = createClient()
  const [limits, setLimits] = useState<FinancialLimit[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // Form State
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('80')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    // 1. Fetch Limits, Accounts, and Categories
    const [{ data: lims }, { data: accs }, { data: cats }] = await Promise.all([
      supabase.from('financial_limits').select('*, account:accounts(name,color), category:categories(name,color,icon)'),
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').order('name'),
    ])

    const accountsList = accs || []
    const categoriesList = cats || []
    setAccounts(accountsList)
    setCategories(categoriesList)

    // 2. Query transactions for the current month to calculate usage on the fly
    const start = getMonthStart()
    const end = getMonthEnd()
    const { data: txs } = await supabase
      .from('transactions')
      .select('account_id, category_id, amount')
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end)

    const transactionsList = txs || []

    // 3. For each limit in the DB, calculate the current month's usage and update it in DB
    if (lims) {
      const updatedLimits = await Promise.all(
        lims.map(async (limit) => {
          let usage = 0

          if (!limit.account_id && !limit.category_id) {
            // Global limit: sum all expenses
            usage = transactionsList.reduce((sum, tx) => sum + Number(tx.amount), 0)
          } else if (limit.account_id && !limit.category_id) {
            // Account-specific limit
            usage = transactionsList
              .filter(tx => tx.account_id === limit.account_id)
              .reduce((sum, tx) => sum + Number(tx.amount), 0)
          } else if (!limit.account_id && limit.category_id) {
            // Category-specific limit
            usage = transactionsList
              .filter(tx => tx.category_id === limit.category_id)
              .reduce((sum, tx) => sum + Number(tx.amount), 0)
          } else if (limit.account_id && limit.category_id) {
            // Combined limit
            usage = transactionsList
              .filter(tx => tx.account_id === limit.account_id && tx.category_id === limit.category_id)
              .reduce((sum, tx) => sum + Number(tx.amount), 0)
          }

          // Update in database if it changed
          if (Number(limit.current_usage) !== usage) {
            await supabase
              .from('financial_limits')
              .update({ current_usage: usage })
              .eq('id', limit.id)
            limit.current_usage = usage
          }

          return limit as FinancialLimit
        })
      )
      setLimits(updatedLimits)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    const limitVal = parseFloat(monthlyLimit)
    const thresholdVal = parseFloat(alertThreshold)

    if (isNaN(limitVal) || limitVal <= 0) {
      setFormError('O limite de gastos deve ser maior que zero.')
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFormError('Usuário não autenticado.')
      setSaving(false)
      return
    }

    const { error: upsertError } = await supabase.from('financial_limits').upsert({
      user_id: user.id,
      account_id: accountId || null,
      category_id: categoryId || null,
      monthly_limit: limitVal,
      alert_threshold: isNaN(thresholdVal) ? 80.00 : thresholdVal,
      current_usage: 0 // Will be auto-calculated on next load
    })

    if (upsertError) {
      console.error(upsertError)
      if (upsertError.message?.includes('duplicate key') || upsertError.code === '23505') {
        setFormError('Já existe um limite configurado com estas mesmas opções.')
      } else {
        setFormError('Erro ao salvar o limite. Verifique os campos.')
      }
      setSaving(false)
      return
    }

    setSaving(false)
    setShowModal(false)
    setAccountId('')
    setCategoryId('')
    setMonthlyLimit('')
    setAlertThreshold('80')
    load()
  }

  async function deleteLimit(id: string) {
    if (!confirm('Excluir este limite de gastos permanentemente?')) return
    await supabase.from('financial_limits').delete().eq('id', id)
    load()
  }

  const currentMonthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  
  // Global limit summary (if exists, or sum of all limits)
  const totalLimit = limits.reduce((s, l) => s + Number(l.monthly_limit), 0)
  const totalSpent = limits.reduce((s, l) => s + Number(l.current_usage), 0)
  const totalPct = totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Limites Mensais</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>Proteção e Controle · {currentMonthLabel}</p>
        </div>
        <button id="create-limit-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Definir Limite
        </button>
      </div>

      {/* Summary Card */}
      <div className="glass-card" style={{
        padding: 'clamp(1.25rem, 3vw, 2rem)',
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, background: 'var(--accent-red)', opacity: 0.03, filter: 'blur(35px)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>Consumo Consolidado dos Limites</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
              <span
                className="money-hero money-value"
                style={{ fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}
                title={formatCurrency(totalSpent)}
              >
                {formatCurrency(totalSpent)}
              </span>
              {totalLimit > 0 && (
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap' }}>
                  / {formatCurrency(totalLimit)}
                </span>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>
              Soma total dos limites definidos para controle de saídas.
            </p>
          </div>

          <div style={{ width: 100, height: 100, position: 'relative', flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-elevated)" strokeWidth="3.5" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke={totalPct >= 90 ? 'var(--accent-red)' : totalPct >= 70 ? 'var(--accent-amber)' : 'var(--accent)'}
                strokeWidth="3.5"
                strokeDasharray={`${totalPct}, 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: totalPct >= 90 ? 'var(--accent-red)' : totalPct >= 70 ? 'var(--accent-amber)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(totalPct)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : limits.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p style={{ fontSize: '1.0625rem', fontWeight: 500, color: 'var(--text-primary)' }}>Nenhum limite de gastos configurado.</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Defina limites mensais para proteger suas economias e evitar excesso de gastos.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Definir primeiro limite</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {limits.map((limit, i) => {
            const limitAny = limit as any
            const account = limitAny.account
            const category = limitAny.category
            
            const spent = Number(limit.current_usage)
            const limitAmount = Number(limit.monthly_limit)
            const pct = limitAmount > 0 ? (spent / limitAmount) * 100 : 0
            const visualPct = Math.min(pct, 100)
            const over = spent > limitAmount
            const attention = pct >= limit.alert_threshold && !over

            // Color Coding: Red for overspent/90%, Amber for warning (70-90% or alert threshold), Green for safe
            const statusColor = over 
              ? 'var(--accent-red)' 
              : attention 
                ? 'var(--accent-amber)' 
                : 'var(--accent)'

            const barClass = over 
              ? 'bg-danger' 
              : attention 
                ? 'bg-warning' 
                : 'bg-safe'

            const title = category?.name 
              ? `Categoria: ${category.name}` 
              : account?.name 
                ? `Núcleo: ${account.name}` 
                : 'Limite Global'

            const iconColor = category?.color ?? account?.color ?? 'var(--accent-blue)'

            return (
              <div key={limit.id} className={`glass-card animate-fade-in delay-${Math.min(i+1, 4)}`} style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: statusColor }} />
                
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                      {category?.name ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      ) : account?.name ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{title}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {category?.name && account?.name ? `No núcleo ${account.name}` : category?.name ? 'Todas as contas' : account?.name ? 'Todos os gastos' : 'Total do sistema'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => deleteLimit(limit.id)} className="btn btn-ghost btn-icon btn-sm" style={{ opacity: 0.5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>

                {/* Progress Stats */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.625rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <span
                      className="money-value"
                      style={{ fontSize: 'var(--text-money-md)', fontWeight: 800, color: statusColor }}
                      title={formatCurrency(spent)}
                    >
                      {formatCurrency(spent)}
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {' '} / {formatCurrency(limitAmount)}
                    </span>
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: statusColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(pct)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-track" style={{ height: 8, marginBottom: '0.75rem' }}>
                  <div className={`progress-bar-fill ${barClass}`} style={{ width: `${visualPct}%`, boxShadow: `0 0 10px ${statusColor}40` }} />
                </div>
                
                {/* Visual Feedback Alerts */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 500 }}>
                  <span style={{ color: statusColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {over ? (
                      <>
                        <span>🚨</span>
                        <span>Limite ultrapassado!</span>
                      </>
                    ) : attention ? (
                      <>
                        <span>⚠️</span>
                        <span>Consumo crítico ({Math.round(limit.alert_threshold)}%)</span>
                      </>
                    ) : (
                      <>
                        <span>🛡️</span>
                        <span>Sob controle</span>
                      </>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {over 
                      ? `${formatCurrency(spent - limitAmount)} excedido` 
                      : `Resta ${formatCurrency(limitAmount - spent)}`
                    }
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content animate-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Definir Limite de Gasto</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem 1.25rem', margin: '1rem 1.5rem 0', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: 'var(--accent-red)', fontSize: '0.8125rem', fontWeight: 500 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label" htmlFor="limit-category">Categoria (opcional)</label>
                <select id="limit-category" className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">Todas as categorias (Limite global/conta)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="input-label" htmlFor="limit-account">Núcleo / Conta (opcional)</label>
                <select id="limit-account" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">Todos os núcleos (Limite global/categoria)</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: '1rem' }}>
                <div>
                  <label className="input-label" htmlFor="limit-amount">Limite mensal (R$)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}>R$</span>
                    <input id="limit-amount" className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} required style={{ paddingLeft: '2.5rem', fontSize: '1.125rem', fontWeight: 600 }} />
                  </div>
                </div>
                <div>
                  <label className="input-label" htmlFor="limit-threshold">Gatilho de Alerta (%)</label>
                  <div style={{ position: 'relative' }}>
                    <input id="limit-threshold" className="input" type="number" min="10" max="100" placeholder="80" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} required style={{ paddingRight: '2rem', fontSize: '1.125rem', fontWeight: 600 }} />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}>%</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.25rem' }}>
                * Se nenhum núcleo e nenhuma categoria forem selecionados, o limite se aplicará ao gasto mensal total consolidado da sua conta.
              </p>

              <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, background: 'var(--accent-red)', color: '#fff', boxShadow: '0 2px 12px rgba(239, 68, 68, 0.25)' }}>
                  {saving ? 'Definindo...' : 'Definir Limite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
