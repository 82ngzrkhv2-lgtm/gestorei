'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Account, Category } from '@/types/database'
import CategoryChips from './CategoryChips'
import { trackEvent } from '@/lib/analytics'

interface Props {
  onClose: () => void
  onSuccess: () => void
  defaultAccountId?: string
  initialType?: 'expense' | 'income' | 'transfer'
}

export default function QuickAddModal({ onClose, onSuccess, defaultAccountId, initialType = 'expense' }: Props) {
  const supabase = createClient()
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(initialType)
  const [amountStr, setAmountStr] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId || '')
  const [destinationId, setDestinationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: accs }, { data: cats }] = await Promise.all([
        supabase.from('accounts').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').order('name')
      ])
      if (accs) {
        setAccounts(accs)
        if (!defaultAccountId && accs.length > 0) {
          setAccountId(accs[0].id)
        }
      }
      if (cats) {
        setCategories(cats)
      }
    }
    load()
  }, [supabase, defaultAccountId])

  const filteredCategories = categories.filter(c => c.type === 'both' || c.type === (type === 'transfer' ? 'expense' : type))

  function handleKeyPad(key: string) {
    if (key === 'backspace') {
      setAmountStr(prev => prev.slice(0, -1))
    } else {
      setAmountStr(prev => {
        if (prev === '' && key === '0') return prev
        if (prev.length >= 10) return prev
        return prev + key
      })
    }
  }

  const numAmount = amountStr ? parseInt(amountStr, 10) / 100 : 0
  
  async function handleSubmit() {
    setError('')
    if (!accountId || numAmount <= 0) return
    if (type === 'transfer' && (!destinationId || accountId === destinationId)) {
      setError('Selecione uma conta de destino válida.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Usuário não autenticado.'); setLoading(false); return }

    try {
      if (type === 'transfer') {
        const sourceAcc = accounts.find(a => a.id === accountId)
        if (sourceAcc && Number(sourceAcc.balance) < numAmount) {
          setError(`Saldo insuficiente.`)
          setLoading(false)
          return
        }

        const transferGroupId = crypto.randomUUID()
        const { error: txError } = await supabase.from('transactions').insert([
          {
            user_id: user.id, account_id: accountId, type: 'transfer', transaction_type: 'transfer',
            amount: numAmount, description: 'Transferência enviada', date: new Date().toISOString().split('T')[0],
            source: 'manual', transfer_group_id: transferGroupId, source_account_id: accountId, destination_account_id: destinationId
          },
          {
            user_id: user.id, account_id: destinationId, type: 'transfer', transaction_type: 'transfer',
            amount: numAmount, description: 'Transferência recebida', date: new Date().toISOString().split('T')[0],
            source: 'manual', transfer_group_id: transferGroupId, source_account_id: accountId, destination_account_id: destinationId
          }
        ])

        if (txError) throw txError

        const destAcc = accounts.find(a => a.id === destinationId)
        await Promise.all([
          supabase.from('accounts').update({ balance: Number(sourceAcc?.balance || 0) - numAmount, updated_at: new Date().toISOString() }).eq('id', accountId),
          supabase.from('accounts').update({ balance: Number(destAcc?.balance || 0) + numAmount, updated_at: new Date().toISOString() }).eq('id', destinationId)
        ])

      } else {
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId || null,
          type,
          transaction_type: type,
          amount: numAmount,
          description: type === 'income' ? 'Entrada manual' : 'Saída manual',
          date: new Date().toISOString().split('T')[0],
          source: 'manual'
        })

        if (txError) throw txError

        const acc = accounts.find(a => a.id === accountId)
        if (acc) {
          const delta = type === 'income' ? numAmount : -numAmount
          await supabase.from('accounts').update({ 
            balance: Number(acc.balance) + delta,
            updated_at: new Date().toISOString()
          }).eq('id', accountId)
        }
      }

      trackEvent('fast_entry_used', { type })
      trackEvent('transaction_added', { type, amount: numAmount })

      setIsSuccess(true)
      setLoading(false)
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar.')
      setLoading(false)
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','backspace','0','confirm']

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && !loading && !isSuccess && onClose()}>
      <div className="modal-content animate-slide-up" style={{ 
        width: '100%', maxWidth: 500, borderRadius: '32px 32px 0 0',
        padding: '2rem 1.5rem 3rem 1.5rem', background: 'var(--bg-base)', border: 'none',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.05)'
      }}>
        {isSuccess ? (
          <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', background: 'var(--bg-card)',
              border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Registrado com sucesso.</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 1. Valor */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor</p>
              <h2 className="money-value" style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.1, marginTop: '0.25rem' }}>
                {formatCurrency(numAmount)}
              </h2>
            </div>
            
            {/* 2. Tipo (Segments) */}
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 12, padding: 4 }}>
               {['expense', 'income', 'transfer'].map(t => (
                 <button key={t} onClick={() => { setType(t as any); setCategoryId('') }} style={{
                   flex: 1, padding: '0.625rem', borderRadius: 8, border: 'none',
                   background: type === t ? 'var(--bg-card)' : 'transparent',
                   color: type === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                   fontWeight: 600, fontSize: '0.875rem',
                   boxShadow: type === t ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s', cursor: 'pointer'
                 }}>
                   {t === 'expense' ? 'Saída' : t === 'income' ? 'Entrada' : 'Mover dinheiro'}
                 </button>
               ))}
            </div>

            {/* 3. Núcleo (Selects) */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>
                  {type === 'transfer' ? 'Sai de' : 'Núcleo'}
                </p>
                <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)} style={{ background: 'var(--bg-elevated)', border: 'none', fontWeight: 600, width: '100%', height: 44 }}>
                  <option value="" disabled>Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {type === 'transfer' && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>Vai para</p>
                  <select className="input" value={destinationId} onChange={e => setDestinationId(e.target.value)} style={{ background: 'var(--bg-elevated)', border: 'none', fontWeight: 600, width: '100%', height: 44 }}>
                    <option value="" disabled>Selecione...</option>
                    {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Categoria */}
            {type !== 'transfer' && (
              <CategoryChips 
                categories={filteredCategories} 
                selectedId={categoryId} 
                onSelect={setCategoryId} 
                disabled={loading} 
              />
            )}

            {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.8125rem', textAlign: 'center', fontWeight: 500, margin: 0 }}>{error}</p>}

            {/* 5. Confirmar / Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
               {keys.map(k => {
                 if (k === 'backspace') {
                   return (
                     <button key={k} onClick={() => handleKeyPad('backspace')} className="keypad-btn-backspace" aria-label="Apagar">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                     </button>
                   )
                 }
                 if (k === 'confirm') {
                   return (
                     <button key={k} onClick={handleSubmit} disabled={loading || numAmount <= 0} className="keypad-btn-confirm">
                       {loading ? '...' : 'Confirmar'}
                     </button>
                   )
                 }
                 return (
                   <button key={k} onClick={() => handleKeyPad(k)} className="keypad-btn">
                     {k}
                   </button>
                 )
               })}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
