'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyGoal, Account, Category } from '@/types/database'

export default function GoalsPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<MonthlyGoal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [monthlySpend, setMonthlySpend] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // Form State
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  const load = useCallback(async () => {
    const [{ data: gs }, { data: accs }, { data: cats }] = await Promise.all([
      supabase.from('monthly_goals').select('*, account:accounts(name,color), category:categories(name,color,icon)').eq('month', thisMonth),
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').eq('type', 'expense').order('name'),
    ])
    if (gs) setGoals(gs as unknown as MonthlyGoal[])
    if (accs) setAccounts(accs)
    if (cats) setCategories(cats)

    // Get monthly spend per category
    const monthStart = thisMonth
    const now = new Date()
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
    const { data: txs } = await supabase.from('transactions').select('category_id, amount').eq('type', 'expense').gte('date', monthStart).lte('date', monthEnd)
    if (txs) {
      const spend: Record<string, number> = {}
      txs.forEach(t => { if (t.category_id) spend[t.category_id] = (spend[t.category_id] ?? 0) + Number(t.amount) })
      setMonthlySpend(spend)
    }

    setLoading(false)
  }, [supabase, thisMonth])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await supabase.from('monthly_goals').upsert({
      account_id: accountId || null,
      category_id: categoryId || null,
      month: thisMonth,
      target_amount: parseFloat(targetAmount),
    }, { onConflict: 'user_id,account_id,category_id,month' })
    setSaving(false); setShowModal(false); setAccountId(''); setCategoryId(''); setTargetAmount(''); load()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Excluir esta meta permanentemente?')) return
    await supabase.from('monthly_goals').delete().eq('id', id)
    load()
  }

  const currentMonthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const totalSpent = goals.reduce((s, g) => s + (monthlySpend[g.category_id ?? ''] ?? 0), 0)
  const totalPct = totalTarget > 0 ? Math.min((totalSpent / totalTarget) * 100, 100) : 0

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Metas Mensais</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{currentMonthLabel}</p>
        </div>
        <button id="create-goal-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Meta
        </button>
      </div>

      {/* Summary Card */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, background: 'var(--accent)', opacity: 0.05, filter: 'blur(30px)', borderRadius: '50%' }} />
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>Gasto Planejado (Global)</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>
                {formatCurrency(totalSpent)}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                / {formatCurrency(totalTarget)}
              </span>
            </div>
          </div>
          
          <div style={{ width: 120, height: 120, position: 'relative' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={totalPct >= 100 ? 'var(--accent-red)' : 'var(--accent)'} strokeWidth="3" strokeDasharray={`${totalPct}, 100`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{Math.round(totalPct)}%</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <p style={{ fontSize: '1.0625rem', fontWeight: 500, color: 'var(--text-primary)' }}>Nenhuma meta para este mês.</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Crie limites de gastos por categoria para manter o controle.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Criar primeira meta</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {goals.map((goal, i) => {
            const goalAny = goal as unknown as Record<string, unknown>
            const account = goalAny.account as { name: string; color: string } | null
            const category = goalAny.category as { name: string; color: string; icon: string } | null
            const spent = monthlySpend[goal.category_id ?? ''] ?? 0
            const pct = Math.min((spent / Number(goal.target_amount)) * 100, 100)
            const over = spent > Number(goal.target_amount)
            const color = category?.color ?? 'var(--accent)'
            
            return (
              <div key={goal.id} className={`glass-card animate-fade-in delay-${Math.min(i+1, 4)}`} style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: over ? 'var(--accent-red)' : color }} />
                
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{category?.name ?? 'Meta Geral'}</h3>
                      {account && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{account.name}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="btn btn-ghost btn-icon btn-sm" style={{ opacity: 0.5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: over ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                      {formatCurrency(spent)}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {' '} / {formatCurrency(Number(goal.target_amount))}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: over ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {Math.round(pct)}%
                  </span>
                </div>

                <div className="progress-bar-track" style={{ height: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: over ? 'var(--accent-red)' : color, boxShadow: `0 0 10px ${over ? 'var(--accent-red-glow)' : color+'40'}` }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  <span style={{ color: over ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {over ? 'Limite excedido!' : 'Dentro da meta'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {over ? `${formatCurrency(spent - Number(goal.target_amount))} acima` : `Restam ${formatCurrency(Number(goal.target_amount) - spent)}`}
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
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Nova Meta Mensal</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label" htmlFor="goal-category">Categoria de gasto</label>
                <select id="goal-category" className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                  <option value="">Selecione uma categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label" htmlFor="goal-account">Núcleo (opcional)</label>
                <select id="goal-account" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">Todas as contas</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label" htmlFor="goal-amount">Limite mensal (R$)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>R$</span>
                  <input id="goal-amount" className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required style={{ paddingLeft: '2.5rem', fontSize: '1.125rem', fontWeight: 600 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
