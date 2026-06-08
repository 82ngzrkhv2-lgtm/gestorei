'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Account, Category } from '@/types/database'

interface Props {
  onClose: () => void
  onSuccess: () => void
  defaultAccountId?: string
}

export default function QuickAddModal({ onClose, onSuccess, defaultAccountId }: Props) {
  const supabase = createClient()
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState(defaultAccountId || '')
  const [destinationAccountId, setDestinationAccountId] = useState('')
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
        supabase.from('categories').select('*').order('name'),
      ])
      if (accs) {
        setAccounts(accs)
        if (!defaultAccountId && accs.length > 0) {
          setAccountId(accs[0].id)
          // Set destination to the second account if available
          if (accs.length > 1) {
            setDestinationAccountId(accs[1].id)
          }
        } else if (defaultAccountId && accs.length > 1) {
          const other = accs.find(a => a.id !== defaultAccountId)
          if (other) setDestinationAccountId(other.id)
        }
      }
      if (cats) setCategories(cats)
    }
    load()
  }, [supabase, defaultAccountId])

  const filteredCategories = categories.filter(c => c.type === 'both' || c.type === (type === 'transfer' ? 'expense' : type))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!accountId || !amount) return
    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Insira um valor válido maior que zero.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { 
      setError('Usuário não autenticado.')
      setLoading(false)
      return 
    }

    try {
      if (type === 'transfer') {
        if (!destinationAccountId) {
          setError('Selecione a conta de destino.')
          setLoading(false)
          return
        }
        if (accountId === destinationAccountId) {
          setError('A conta de origem e destino devem ser diferentes.')
          setLoading(false)
          return
        }

        const sourceAcc = accounts.find(a => a.id === accountId)
        if (sourceAcc && Number(sourceAcc.balance) < numAmount) {
          setError(`Saldo insuficiente no núcleo de origem. Saldo atual: ${formatCurrency(Number(sourceAcc.balance))}`)
          setLoading(false)
          return
        }

        const transferGroupId = crypto.randomUUID()
        const sourceAccName = sourceAcc?.name || 'Origem'
        const destAcc = accounts.find(a => a.id === destinationAccountId)
        const destAccName = destAcc?.name || 'Destino'

        // Insert both transactions
        const { error: txError } = await supabase.from('transactions').insert([
          {
            user_id: user.id,
            account_id: accountId,
            category_id: null,
            type: 'transfer',
            transaction_type: 'transfer',
            amount: numAmount,
            description: description.trim() || `Transferência enviada para ${destAccName}`,
            date,
            source: 'manual',
            transfer_group_id: transferGroupId,
            source_account_id: accountId,
            destination_account_id: destinationAccountId
          },
          {
            user_id: user.id,
            account_id: destinationAccountId,
            category_id: null,
            type: 'transfer',
            transaction_type: 'transfer',
            amount: numAmount,
            description: description.trim() || `Transferência recebida de ${sourceAccName}`,
            date,
            source: 'manual',
            transfer_group_id: transferGroupId,
            source_account_id: accountId,
            destination_account_id: destinationAccountId
          }
        ])

        if (txError) throw txError

        // Update balances
        await Promise.all([
          supabase.from('accounts').update({
            balance: Number(sourceAcc?.balance || 0) - numAmount,
            updated_at: new Date().toISOString()
          }).eq('id', accountId),
          supabase.from('accounts').update({
            balance: Number(destAcc?.balance || 0) + numAmount,
            updated_at: new Date().toISOString()
          }).eq('id', destinationAccountId)
        ])

      } else {
        // Normal Transaction (Income/Expense)
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId || null,
          type,
          transaction_type: type,
          amount: numAmount,
          description: description.trim() || null,
          date,
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

      // Success visual feedback trigger
      setIsSuccess(true)
      setLoading(false)
      
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1800)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro ao registrar movimentação.')
      setLoading(false)
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value.replace(/\D/g, '')
    if (!val) { setAmount(''); return }
    val = (Number(val) / 100).toFixed(2)
    val = val.replace('.', ',')
    val = val.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setAmount(val)
  }

  const activeTabColor = type === 'income' 
    ? 'var(--accent)' 
    : type === 'expense' 
      ? 'var(--accent-red)' 
      : 'var(--accent-blue)'

  const sourceAccName = accounts.find(a => a.id === accountId)?.name || 'Origem'
  const destAccName = accounts.find(a => a.id === destinationAccountId)?.name || 'Destino'
  const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && !isSuccess && onClose()}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: 420, overflow: 'hidden' }}>
        
        {isSuccess ? (
          <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', marginBottom: '1.5rem', boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              {type === 'transfer' ? 'Transferência Realizada!' : 'Movimentação Salva!'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 300 }}>
              {type === 'transfer' ? (
                <span>
                  <strong>{formatCurrency(numAmount)}</strong> transferidos de <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sourceAccName}</span> para <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{destAccName}</span>.
                </span>
              ) : (
                <span>
                  Lançamento de <strong>{formatCurrency(numAmount)}</strong> registrado em <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sourceAccName}</span>.
                </span>
              )}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Nova Movimentação</h2>
              <button onClick={onClose} className="btn btn-ghost btn-icon" disabled={loading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1.25rem', margin: '1rem 1.5rem 0', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: 'var(--accent-red)', fontSize: '0.8125rem', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Type Toggle */}
              <div className="type-toggle">
                <button type="button" 
                  className={`type-toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
                  onClick={() => { setType('expense'); setError('') }}
                  disabled={loading}
                >
                  Saída
                </button>
                <button type="button" 
                  className={`type-toggle-btn ${type === 'income' ? 'active-income' : ''}`}
                  onClick={() => { setType('income'); setError('') }}
                  disabled={loading}
                >
                  Entrada
                </button>
                <button type="button" 
                  className={`type-toggle-btn ${type === 'transfer' ? 'active-transfer' : ''}`}
                  onClick={() => { setType('transfer'); setError('') }}
                  disabled={loading}
                >
                  Transferir
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
                    disabled={loading}
                    style={{ 
                      width: 'auto', background: 'transparent', border: 'none', 
                      fontSize: '3rem', fontWeight: 800, padding: 0, textAlign: 'center',
                      color: activeTabColor,
                      letterSpacing: '-0.04em',
                      boxShadow: 'none'
                    }} 
                  />
                </div>
              </div>

              <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

              {/* Description / Observação */}
              <div>
                <label className="input-label">
                  {type === 'transfer' ? 'Observação (Opcional)' : 'Descrição'}
                </label>
                <input 
                  className="input" 
                  placeholder={type === 'transfer' ? 'Ex: Reserva de emergência, Investimento...' : 'Ex: Supermercado, Salário...'} 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  disabled={loading}
                />
              </div>

              {/* Accounts & Date Grid */}
              {type === 'transfer' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="input-label">Núcleo de Origem</label>
                      <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)} required disabled={loading}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Núcleo de Destino</label>
                      <select className="input" value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} required disabled={loading}>
                        <option value="">Selecione...</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Data</label>
                    <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required disabled={loading} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="input-label">Núcleo</label>
                      <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)} required disabled={loading}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Data</label>
                      <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required disabled={loading} />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="input-label">Categoria</label>
                    <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required disabled={loading}>
                      <option value="">Selecione...</option>
                      {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Submit */}
              <button 
                type="submit" 
                className="btn btn-primary btn-lg" 
                disabled={loading} 
                style={{ 
                  marginTop: '0.5rem', width: '100%',
                  background: activeTabColor,
                  boxShadow: `0 4px 14px ${type === 'expense' ? 'rgba(239, 68, 68, 0.25)' : type === 'income' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
                }}
              >
                {loading ? 'Processando...' : type === 'transfer' ? 'Confirmar Transferência' : `Confirmar ${type === 'income' ? 'Entrada' : 'Saída'}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
