'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getAccountTypeLabel } from '@/lib/utils'
import type { Account } from '@/types/database'
import Link from 'next/link'

const ACCOUNT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']
const ACCOUNT_TYPES = [
  { value: 'personal', label: 'Pessoal' },
  { value: 'business', label: 'Empresa' },
  { value: 'ads', label: 'Anúncios' },
  { value: 'investment', label: 'Investimento' },
  { value: 'card', label: 'Cartão' },
  { value: 'reserve', label: 'Reserva' },
  { value: 'agency', label: 'Agência' },
  { value: 'other', label: 'Outro' },
]
const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'ARS']

export default function AccountsPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState('personal')
  const [color, setColor] = useState('#10b981')
  const [currency, setCurrency] = useState('BRL')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('accounts').select('*').eq('is_active', true).order('name')
    if (data) setAccounts(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditAccount(null); setName(''); setType('personal'); setColor('#10b981'); setCurrency('BRL')
    setShowModal(true)
  }

  function openEdit(a: Account) {
    setEditAccount(a); setName(a.name); setType(a.type); setColor(a.color); setCurrency(a.currency)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (editAccount) {
      await supabase.from('accounts').update({ name, type, color, currency, updated_at: new Date().toISOString() }).eq('id', editAccount.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('accounts').insert({ user_id: user.id, name, type, color, currency, icon: 'wallet', balance: 0 })
      }
    }
    setSaving(false); setShowModal(false); load()
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Desativar esta conta?')) return
    await supabase.from('accounts').update({ is_active: false }).eq('id', id)
    load()
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Núcleos Financeiros</h1>
          <p className="page-subtitle">Organize seu dinheiro por contexto</p>
        </div>
        <button id="create-account-btn" className="btn btn-primary" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Núcleo
        </button>
      </div>

      {/* Summary */}
      <div className="stat-card animate-fade-in" style={{ 
        marginBottom: '2rem', display: 'inline-flex', flexDirection: 'column', minWidth: 260,
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%',
          background: totalBalance >= 0 ? 'var(--accent)' : 'var(--accent-red)', opacity: 0.1, filter: 'blur(20px)'
        }} />
        <span className="stat-label">Patrimônio Total</span>
        <span className="stat-value money-value" style={{ color: totalBalance >= 0 ? 'var(--text-primary)' : 'var(--accent-red)', marginTop: 8 }}>
          {formatCurrency(totalBalance)}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {accounts.map((a, i) => (
            <div key={a.id} className={`glass-card animate-fade-in delay-${Math.min(i+1, 4)}`} style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Color accent bar on top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: a.color }} />
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{a.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                    {getAccountTypeLabel(a.type)} <span style={{ color: 'var(--border)' }}>|</span> {a.currency}
                  </p>
                </div>
                <button onClick={() => openEdit(a)} className="btn btn-ghost btn-icon" title="Editar" style={{ color: 'var(--text-muted)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
              
              {/* Balance */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Saldo Atual</p>
                <p className="money-value" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: Number(a.balance) >= 0 ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                  {formatCurrency(Number(a.balance), a.currency)}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href={`/accounts/${a.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>
                  Ver histórico
                </Link>
                <button onClick={() => handleDeactivate(a.id)} className="btn btn-ghost btn-icon btn-sm" title="Desativar" style={{ background: 'var(--bg-elevated)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content animate-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{editAccount ? 'Editar Núcleo' : 'Novo Núcleo'}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label" htmlFor="acc-name">Nome da conta</label>
                <input id="acc-name" className="input" placeholder="Ex: Facebook Ads" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label" htmlFor="acc-type">Tipo</label>
                  <select id="acc-type" className="input" value={type} onChange={e => setType(e.target.value)}>
                    {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label" htmlFor="acc-currency">Moeda</label>
                  <select id="acc-currency" className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Cor do Núcleo</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      style={{ 
                        width: 36, height: 36, borderRadius: '50%', background: c, 
                        border: color === c ? '3px solid white' : '2px solid transparent', 
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: color === c ? `0 0 0 2px ${c}40` : 'none'
                      }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button id="acc-save" type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : editAccount ? 'Salvar alterações' : 'Criar Núcleo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
