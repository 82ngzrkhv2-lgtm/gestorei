'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account, Category } from '@/types/database'

interface Props {
  onClose: () => void
  onSuccess: () => void
  defaultAccountId?: string
}

export default function QuickAddModal({ onClose, onSuccess, defaultAccountId }: Props) {
  const supabase = createClient()
  const [type, setType] = useState<'expense'|'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState(defaultAccountId || '')
  const [categoryId, setCategoryId] = useState('')
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: accs }, { data: cats }] = await Promise.all([
        supabase.from('accounts').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
      ])
      if (accs) {
        setAccounts(accs)
        if (!defaultAccountId && accs.length > 0) setAccountId(accs[0].id)
      }
      if (cats) setCategories(cats)
    }
    load()
  }, [supabase, defaultAccountId])

  const filteredCategories = categories.filter(c => c.type === 'both' || c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId || !amount) return
    setLoading(true)

    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId || null,
      type,
      amount: numAmount,
      description,
      date,
      source: 'manual'
    })

    // Update account balance
    const acc = accounts.find(a => a.id === accountId)
    if (acc) {
      const delta = type === 'income' ? numAmount : -numAmount
      await supabase.from('accounts').update({ 
        balance: Number(acc.balance) + delta,
        updated_at: new Date().toISOString()
      }).eq('id', accountId)
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  // Format currency on type
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value.replace(/\D/g, '')
    if (!val) { setAmount(''); return }
    val = (Number(val) / 100).toFixed(2)
    val = val.replace('.', ',')
    val = val.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setAmount(val)
  }

  const isIncome = type === 'income'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Nova Movimentação</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Type Toggle */}
          <div className="type-toggle">
            <button type="button" 
              className={`type-toggle-btn ${!isIncome ? 'active-expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Saída
            </button>
            <button type="button" 
              className={`type-toggle-btn ${isIncome ? 'active-income' : ''}`}
              onClick={() => setType('income')}
            >
              Entrada
            </button>
          </div>

          {/* Amount */}
          <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>Valor</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>R$</span>
              <input 
                type="text" 
                inputMode="numeric"
                className="input" 
                placeholder="0,00" 
                value={amount} 
                onChange={handleAmountChange} 
                required 
                style={{ 
                  width: 'auto', background: 'transparent', border: 'none', 
                  fontSize: '3rem', fontWeight: 800, padding: 0, textAlign: 'center',
                  color: isIncome ? 'var(--accent)' : 'var(--text-primary)',
                  letterSpacing: '-0.04em',
                  boxShadow: 'none'
                }} 
              />
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

          {/* Description */}
          <div>
            <label className="input-label">Descrição</label>
            <input className="input" placeholder="Ex: Supermercado, Salário..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Grid fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Núcleo</label>
              <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Data</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="input-label">Categoria</label>
            <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              <option value="">Selecione...</option>
              {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '0.5rem', width: '100%' }}>
            {loading ? 'Salvando...' : `Confirmar ${isIncome ? 'Entrada' : 'Saída'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
