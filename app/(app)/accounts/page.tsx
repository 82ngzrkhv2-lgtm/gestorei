'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@/types/database'
import QuickAddModal from '@/components/transactions/QuickAddModal'

const ACCOUNT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

export default function AccountsPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [color, setColor] = useState('#10b981')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('accounts').select('*').eq('is_active', true).order('name')
    if (data) setAccounts(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditAccount(null); setName(''); setColor('#10b981')
    setShowCreateModal(true)
  }

  function openEdit(a: Account) {
    setEditAccount(a); setName(a.name); setColor(a.color)
    setShowCreateModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (editAccount) {
      await supabase.from('accounts').update({ name, color, updated_at: new Date().toISOString() }).eq('id', editAccount.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('accounts').insert({ 
          user_id: user.id, 
          name, 
          color, 
          type: 'personal', // Padrão invisível
          currency: 'BRL',  // Padrão invisível
          icon: 'wallet', 
          balance: 0 
        })
      }
    }
    setSaving(false); setShowCreateModal(false); load()
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      
      {/* Header Simplificado */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Núcleos</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>Organize seu dinheiro sem complicação.</p>
      </div>

      {/* Patrimônio Total - Texto Limpo */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.25rem' }}>Total organizado</p>
        <p className="money-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {formatCurrency(totalBalance)}
        </p>
        
        {/* CTA Transferência */}
        <button 
          onClick={() => setShowTransferModal(true)}
          style={{ 
            marginTop: '1.25rem',
            background: '#171717', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 12, 
            padding: '0.75rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Transferir entre núcleos
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Seus espaços</h2>
        <button onClick={openCreate} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: '20px' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {accounts.map((a) => (
            <div 
              key={a.id} 
              onClick={() => openEdit(a)}
              style={{ 
                background: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.06)', 
                borderRadius: '20px', 
                padding: '1.25rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem',
                cursor: 'pointer',
                transition: 'transform 0.12s ease-out',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: a.color }} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#171717' }}>{a.name}</span>
              </div>
              
              <div>
                <p className="money-value" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#171717' }}>
                  {formatCurrency(Number(a.balance), a.currency)}
                </p>
              </div>

            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8125rem', color: '#6b6b6b' }}>Cada núcleo ajuda você a enxergar melhor.</p>
      </div>

      {/* Modal de Criação Ultra-Simples */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal-content animate-slide-up" style={{ 
            width: '100%', maxWidth: 500, borderRadius: '32px 32px 0 0',
            padding: '2rem 1.5rem 3rem 1.5rem', background: '#ffffff', border: 'none',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#171717' }}>{editAccount ? 'Editar Núcleo' : 'Novo Núcleo'}</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#6b6b6b', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6b6b6b', marginBottom: '0.5rem' }}>Nome</label>
                <input 
                  className="input" 
                  placeholder="Ex: Viagem" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  autoFocus
                  style={{ height: '3.5rem', fontSize: '1.125rem', fontWeight: 500, background: '#f7f6f2', border: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#6b6b6b', marginBottom: '0.75rem' }}>Cor</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      style={{ 
                        width: 44, height: 44, borderRadius: '50%', background: c, 
                        border: color === c ? '3px solid white' : '2px solid transparent', 
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: color === c ? `0 0 0 2px ${c}50` : 'none'
                      }} />
                  ))}
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={saving || !name} style={{ height: '3.5rem', borderRadius: 16, marginTop: '1rem', background: '#171717', color: '#ffffff', fontSize: '1rem', fontWeight: 600 }}>
                {saving ? 'Salvando...' : 'Salvar Núcleo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Transferência Integrado */}
      {showTransferModal && (
        <QuickAddModal 
          onClose={() => setShowTransferModal(false)} 
          onSuccess={load}
          initialType="transfer"
        />
      )}

    </div>
  )
}
