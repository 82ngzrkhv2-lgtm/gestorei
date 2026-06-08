'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Alert, Account } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

const ALERT_TYPES = [
  { value: 'low_balance', label: 'Saldo Baixo', desc: 'Dispara quando o saldo cai abaixo do limite', color: '#f59e0b', needsThreshold: true },
  { value: 'expense_spike', label: 'Aumento de Gastos', desc: 'Dispara quando os gastos sobem 30%+ vs. mês anterior', color: '#ef4444', needsThreshold: false },
  { value: 'net_negative', label: 'Resultado Negativo', desc: 'Dispara quando as saídas superam as entradas no mês', color: '#ef4444', needsThreshold: false },
  { value: 'over_goal', label: 'Meta Ultrapassada', desc: 'Dispara quando o gasto supera a meta da categoria', color: '#8b5cf6', needsThreshold: false },
]

export default function AlertsPage() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [alertType, setAlertType] = useState('low_balance')
  const [accountId, setAccountId] = useState('')
  const [threshold, setThreshold] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: als }, { data: accs }] = await Promise.all([
      supabase.from('alerts').select('*, account:accounts(name,color)').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
    ])
    if (als) setAlerts(als as unknown as Alert[])
    if (accs) setAccounts(accs)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const cfg = ALERT_TYPES.find(a => a.value === alertType)
    await supabase.from('alerts').insert({
      account_id: accountId || null,
      type: alertType,
      threshold: cfg?.needsThreshold ? parseFloat(threshold) : null,
    })
    setSaving(false); setShowModal(false); load()
  }

  async function toggleAlert(id: string, current: boolean) {
    await supabase.from('alerts').update({ is_active: !current }).eq('id', id)
    load()
  }

  async function deleteAlert(id: string) {
    if (!confirm('Excluir este alerta?')) return
    await supabase.from('alerts').delete().eq('id', id)
    load()
  }

  const selectedType = ALERT_TYPES.find(a => a.value === alertType)

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Alertas</h1>
          <p className="page-subtitle">Regras automáticas de monitoramento</p>
        </div>
        <button id="create-alert-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Alerta
        </button>
      </div>

      {/* Alert type explanations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {ALERT_TYPES.map(at => (
          <div key={at.value} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${at.color}` }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{at.label}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{at.desc}</p>
          </div>
        ))}
      </div>

      {/* Alerts list */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="section-header"><span className="section-title">Alertas Configurados</span></div>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 8 }} />)
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <p>Nenhum alerta configurado ainda.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Criar primeiro alerta</button>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const alertAny = alert as unknown as Record<string, unknown>
            const account = alertAny.account as { name: string; color: string } | null
            const typeCfg = ALERT_TYPES.find(a => a.value === alert.type)
            return (
              <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 0', borderBottom: i < alerts.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: alert.is_active ? typeCfg?.color ?? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{typeCfg?.label ?? alert.type}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {account ? `Conta: ${account.name}` : 'Todas as contas'}
                    {alert.threshold !== null && ` · Limite: ${formatCurrency(Number(alert.threshold))}`}
                  </p>
                </div>
                <button onClick={() => toggleAlert(alert.id, alert.is_active)} className={`btn btn-sm ${alert.is_active ? 'btn-secondary' : 'btn-primary'}`}>
                  {alert.is_active ? 'Pausar' : 'Ativar'}
                </button>
                <button onClick={() => deleteAlert(alert.id)} className="btn btn-danger btn-icon btn-sm">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content animate-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Novo Alerta</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label" htmlFor="alert-type">Tipo de alerta</label>
                <select id="alert-type" className="input" value={alertType} onChange={e => setAlertType(e.target.value)}>
                  {ALERT_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                {selectedType && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>{selectedType.desc}</p>}
              </div>
              <div>
                <label className="input-label" htmlFor="alert-account">Conta (opcional)</label>
                <select id="alert-account" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">Todas as contas</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {selectedType?.needsThreshold && (
                <div>
                  <label className="input-label" htmlFor="alert-threshold">Limite mínimo (R$)</label>
                  <input id="alert-threshold" className="input" type="number" step="0.01" min="0" placeholder="Ex: 500" value={threshold} onChange={e => setThreshold(e.target.value)} required />
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : 'Criar Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
