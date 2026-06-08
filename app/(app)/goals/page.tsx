'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateFull } from '@/lib/utils'
import type { FinancialGoal, Account } from '@/types/database'

const GOAL_TYPES = [
  { value: 'reserva', label: 'Reserva de Emergência' },
  { value: 'economia', label: 'Economia / Poupança' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'patrimonio', label: 'Patrimônio Alvo' },
  { value: 'faturamento', label: 'Meta de Faturamento' },
  { value: 'pessoal', label: 'Objetivo Pessoal' },
  { value: 'empresarial', label: 'Objetivo Empresarial' },
]

export default function GoalsPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [goalType, setGoalType] = useState('reserva')
  const [accountId, setAccountId] = useState('')
  const [deadlinePreset, setDeadlinePreset] = useState('this_year')
  const [customEndDate, setCustomEndDate] = useState('')

  const load = useCallback(async () => {
    const [{ data: gs }, { data: accs }] = await Promise.all([
      supabase.from('financial_goals').select('*, account:accounts(name,color)').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
    ])
    if (gs) setGoals(gs as unknown as FinancialGoal[])
    if (accs) setAccounts(accs)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    const targetVal = parseFloat(targetAmount)
    const currentVal = parseFloat(currentAmount || '0')

    if (isNaN(targetVal) || targetVal <= 0) {
      setFormError('O valor alvo deve ser maior que zero.')
      setSaving(false)
      return
    }

    if (isNaN(currentVal) || currentVal < 0) {
      setFormError('O valor guardado não pode ser negativo.')
      setSaving(false)
      return
    }

    // Determine end date
    const today = new Date()
    let endDateStr: string | null = null

    if (deadlinePreset === 'this_month') {
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    } else if (deadlinePreset === 'this_year') {
      endDateStr = `${today.getFullYear()}-12-31`
    } else if (deadlinePreset === '1_year') {
      endDateStr = `${today.getFullYear() + 1}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    } else if (deadlinePreset === '5_years') {
      endDateStr = `${today.getFullYear() + 5}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    } else if (deadlinePreset === '10_years') {
      endDateStr = `${today.getFullYear() + 10}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    } else if (deadlinePreset === 'custom') {
      if (!customEndDate) {
        setFormError('Selecione uma data para o prazo personalizado.')
        setSaving(false)
        return
      }
      endDateStr = customEndDate
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFormError('Usuário não autenticado.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('financial_goals').insert({
      user_id: user.id,
      title,
      description: description.trim() || null,
      target_amount: targetVal,
      current_amount: currentVal,
      goal_type: goalType,
      account_id: accountId || null,
      end_date: endDateStr,
      status: currentVal >= targetVal ? 'completed' : 'in_progress'
    })

    if (insertError) {
      console.error(insertError)
      setFormError('Erro ao criar a meta. Verifique os dados inseridos.')
      setSaving(false)
      return
    }

    setSaving(false)
    setShowModal(false)
    setTitle('')
    setDescription('')
    setTargetAmount('')
    setCurrentAmount('')
    setGoalType('reserva')
    setAccountId('')
    setDeadlinePreset('this_year')
    setCustomEndDate('')
    load()
  }

  async function updateProgress(goalId: string, current: number, target: number) {
    const newVal = prompt('Digite o novo valor guardado acumulado (R$):', current.toString())
    if (newVal === null) return
    const num = parseFloat(newVal)
    if (isNaN(num) || num < 0) {
      alert('Valor inválido.')
      return
    }

    const status = num >= target ? 'completed' : 'in_progress'

    await supabase
      .from('financial_goals')
      .update({ current_amount: num, status })
      .eq('id', goalId)

    load()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Excluir esta meta permanentemente?')) return
    await supabase.from('financial_goals').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Metas Financeiras</h1>
          <p className="page-subtitle">Planejamento, objetivos e crescimento patrimonial</p>
        </div>
        <button id="create-goal-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Meta
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem' }}>
          <div className="empty-state">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <p style={{ fontSize: '1.0625rem', fontWeight: 500, color: 'var(--text-primary)' }}>Nenhuma meta em andamento.</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Crie metas para organizar seu dinheiro estrategicamente e alcançar seus objetivos de vida.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Definir primeira meta</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {goals.map((goal, i) => {
            const goalAny = goal as any
            const account = goalAny.account

            const target = Number(goal.target_amount)
            const current = Number(goal.current_amount)
            const remaining = Math.max(0, target - current)
            const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

            // Days calculation
            const today = new Date()
            today.setHours(0,0,0,0)
            const start = new Date(goal.start_date)
            const end = goal.end_date ? new Date(goal.end_date) : null
            
            let daysRemaining = 0
            let monthsRemaining = 1
            let totalDays = 1
            let daysElapsed = 0

            if (end) {
              daysRemaining = Math.max(0, Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24)))
              monthsRemaining = Math.max(1, Math.round(daysRemaining / 30.44))
              totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)))
              daysElapsed = Math.max(0, Math.round((today.getTime() - start.getTime()) / (1000 * 3600 * 24)))
            }

            const monthlySavingNeeded = remaining > 0 ? (remaining / monthsRemaining) : 0

            // Mathematical Insights
            let insight = ''
            let insightColor = 'var(--text-secondary)'
            let insightBg = 'var(--bg-elevated)'

            if (current >= target) {
              insight = '🚀 Meta concluída! Parabéns pela conquista!'
              insightColor = 'var(--accent)'
              insightBg = 'rgba(16, 185, 129, 0.08)'
            } else if (end && today > end) {
              insight = '⚠️ O prazo desta meta expirou.'
              insightColor = 'var(--accent-red)'
              insightBg = 'rgba(239, 68, 68, 0.08)'
            } else if (end) {
              const timeProgress = Math.min(1, daysElapsed / totalDays)
              const financialProgress = current / target

              if (financialProgress >= timeProgress + 0.05) {
                insight = '🚀 Você alcançará sua meta antes do prazo.'
                insightColor = 'var(--accent)'
                insightBg = 'rgba(16, 185, 129, 0.08)'
              } else if (financialProgress >= timeProgress - 0.05) {
                insight = '✅ Você está acima da média necessária.'
                insightColor = 'var(--accent-blue)'
                insightBg = 'rgba(59, 130, 246, 0.08)'
              } else {
                insight = '⚠️ Nesse ritmo, sua meta atrasará.'
                insightColor = 'var(--accent-amber)'
                insightBg = 'rgba(245, 158, 11, 0.08)'
              }
            } else {
              insight = '📈 Acompanhando seu ritmo de economia.'
            }

            const typeLabel = GOAL_TYPES.find(t => t.value === goal.goal_type)?.label || 'Meta'

            return (
              <div key={goal.id} className={`glass-card animate-fade-in delay-${Math.min(i+1, 4)}`} style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Visual indicator (emerald glow border) */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: current >= target ? 'var(--accent)' : 'var(--accent-blue)' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {typeLabel}
                    </span>
                    <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginTop: 2, color: 'var(--text-primary)' }}>{goal.title}</h3>
                    {account && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: account.color }} />
                        {account.name}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => updateProgress(goal.id, current, target)} className="btn btn-ghost btn-icon btn-sm" title="Atualizar valor guardado">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="btn btn-ghost btn-icon btn-sm" style={{ opacity: 0.5 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>

                {goal.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {goal.description}
                  </p>
                )}

                {/* Values progress */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      {formatCurrency(current)}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {' '} / {formatCurrency(target)}
                    </span>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: current >= target ? 'var(--accent)' : 'var(--accent-blue)' }}>
                    {Math.round(pct)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="progress-bar-track" style={{ height: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: current >= target ? 'var(--accent)' : 'var(--accent-blue)', boxShadow: `0 0 10px ${current >= target ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}` }} />
                </div>

                {/* Required savings and deadline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <span>
                    {end ? `Prazo: ${formatDateFull(goal.end_date!)}` : 'Sem prazo definido'}
                  </span>
                  <span>
                    {end && daysRemaining > 0 && remaining > 0 ? (
                      `Faltam ${daysRemaining} dias`
                    ) : remaining <= 0 ? (
                      'Alcançado! 🌟'
                    ) : (
                      'Prazo encerrado'
                    )}
                  </span>
                </div>

                {remaining > 0 && daysRemaining > 0 && (
                  <div style={{ background: 'var(--bg-hover)', padding: '0.625rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Aporte mensal sugerido:</span>
                    <span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(monthlySavingNeeded)}/mês</span>
                  </div>
                )}

                {/* Mathematical Insight Banner */}
                <div style={{ background: insightBg, padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.8125rem', color: insightColor, fontWeight: 600 }}>
                  {insight}
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
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Nova Meta Financeira</h2>
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
                <label className="input-label" htmlFor="goal-title">Nome da Meta</label>
                <input id="goal-title" className="input" placeholder="Ex: Reserva de Emergência, Comprar Carro" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div>
                <label className="input-label" htmlFor="goal-desc">Descrição / Objetivo (opcional)</label>
                <input id="goal-desc" className="input" placeholder="Ex: Caixa de 6 meses para custos pessoais" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label" htmlFor="goal-target">Valor Alvo (R$)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>R$</span>
                    <input id="goal-target" className="input" type="number" step="0.01" min="0.01" placeholder="50000.00" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required style={{ paddingLeft: '2.5rem', fontSize: '1.0625rem', fontWeight: 600 }} />
                  </div>
                </div>
                <div>
                  <label className="input-label" htmlFor="goal-current">Já Guardado (R$)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>R$</span>
                    <input id="goal-current" className="input" type="number" step="0.01" min="0" placeholder="0.00" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} style={{ paddingLeft: '2.5rem', fontSize: '1.0625rem', fontWeight: 600 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label" htmlFor="goal-type-select">Tipo de Meta</label>
                  <select id="goal-type-select" className="input" value={goalType} onChange={e => setGoalType(e.target.value)}>
                    {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="input-label" htmlFor="goal-account-select">Núcleo Relacionado</label>
                  <select id="goal-account-select" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Nenhum</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="goal-preset">Prazo</label>
                <select id="goal-preset" className="input" value={deadlinePreset} onChange={e => setDeadlinePreset(e.target.value)}>
                  <option value="this_month">Este mês</option>
                  <option value="this_year">Este ano</option>
                  <option value="1_year">Daqui a 1 ano</option>
                  <option value="5_years">Daqui a 5 anos</option>
                  <option value="10_years">Daqui a 10 anos</option>
                  <option value="custom">Escolher data específica</option>
                </select>
              </div>

              {deadlinePreset === 'custom' && (
                <div>
                  <label className="input-label" htmlFor="goal-custom-date">Data de Prazo</label>
                  <input id="goal-custom-date" type="date" className="input" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} required />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, background: 'var(--accent-blue)', color: '#fff', boxShadow: '0 2px 12px rgba(59, 130, 246, 0.25)' }}>
                  {saving ? 'Criando...' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
