'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserSummarySettings } from '@/types/database'

// ─── Default settings ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Omit<UserSummarySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  whatsapp_number: '',
  daily_summary_enabled: true,
  weekly_summary_enabled: true,
  monthly_summary_enabled: true,
  daily_send_hour: 20,
  weekly_send_day: 6,
  monthly_send_day: 1,
}

// ─── Types ────────────────────────────────────────────────────────────────────────

type SummaryType = 'daily' | 'weekly' | 'monthly'

interface PreviewState {
  message: string
  loading: boolean
  error: string | null
}

// ─── Sub-components ──────────────────────────────────────────────────────────────

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: checked ? 'var(--accent)' : 'var(--bg-elevated)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s ease',
        flexShrink: 0,
        outline: 'none',
        boxShadow: checked ? '0 0 12px var(--accent-glow)' : 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.25s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="input"
      style={{ width: 'auto', minWidth: 160 }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function HealthBadge({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.25rem 0.75rem',
      borderRadius: 20,
      fontSize: '0.8125rem',
      fontWeight: 600,
      background: `${color}18`,
      border: `1px solid ${color}35`,
      color,
    }}>
      {emoji} {label}
    </span>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────────

function PreviewModal({
  type,
  onClose,
}: {
  type: SummaryType
  onClose: () => void
}) {
  const [state, setState] = useState<PreviewState>({ message: '', loading: true, error: null })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch('/api/summaries/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setState({ message: '', loading: false, error: data.error })
        else setState({ message: data.message, loading: false, error: null })
      })
      .catch(err => setState({ message: '', loading: false, error: err.message }))
  }, [type])

  async function handleSend() {
    setSending(true)
    try {
      const r = await fetch('/api/summaries/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, send: true }),
      })
      const data = await r.json()
      if (data.error) setState(s => ({ ...s, error: data.error }))
      else setSent(true)
    } finally {
      setSending(false)
    }
  }

  const typeLabels: Record<SummaryType, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 400,
          animation: 'fadeIn 0.2s ease both',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview do Resumo ${typeLabels[type]}`}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(540px, 94vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 401,
          animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
          padding: '1.75rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
              📱 Preview — Resumo {typeLabels[type]}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              Prévia da mensagem que será enviada ao WhatsApp
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        {state.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <div className="spinner" />
          </div>
        ) : state.error ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <p style={{ color: 'var(--accent-red)' }}>{state.error}</p>
          </div>
        ) : (
          <>
            {/* WhatsApp message bubble */}
            <div style={{
              background: '#0b141a',
              borderRadius: 16,
              padding: '1.25rem',
              fontFamily: '"Segoe UI", sans-serif',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
            }}>
              <div style={{
                background: '#1f2c34',
                borderRadius: 12,
                borderTopLeftRadius: 4,
                padding: '0.875rem 1rem',
                color: '#e9edef',
                maxWidth: '90%',
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
              }}>
                {state.message}
              </div>
              <p style={{ color: '#667781', fontSize: '0.6875rem', marginTop: '0.375rem', textAlign: 'right' }}>
                Prévia • FinCockpit
              </p>
            </div>

            {/* Actions */}
            {sent ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.875rem 1rem',
                background: 'rgba(37,211,102,0.1)',
                border: '1px solid rgba(37,211,102,0.25)',
                borderRadius: 12,
                color: '#25D366',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mensagem enviada com sucesso!
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="btn btn-ghost">
                  Fechar
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="btn btn-primary"
                  id={`send-preview-${type}-btn`}
                  style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                >
                  {sending ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="spinner" style={{ width: 14, height: 14 }} /> Enviando...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Enviar agora
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Omit<UserSummarySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<SummaryType | null>(null)

  // Load settings
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_summary_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettings({
          whatsapp_number: data.whatsapp_number ?? '',
          daily_summary_enabled: data.daily_summary_enabled ?? true,
          weekly_summary_enabled: data.weekly_summary_enabled ?? true,
          monthly_summary_enabled: data.monthly_summary_enabled ?? true,
          daily_send_hour: data.daily_send_hour ?? 20,
          weekly_send_day: data.weekly_send_day ?? 6,
          monthly_send_day: data.monthly_send_day ?? 1,
        })
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { error: upsertError } = await supabase
        .from('user_summary_settings')
        .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      if (upsertError) throw upsertError

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }, [supabase, settings])

  // Hour options 18–23
  const hourOptions = Array.from({ length: 8 }, (_, i) => i + 16).map(h => ({
    value: h,
    label: `${String(h).padStart(2, '0')}:00`,
  }))

  const weekDayOptions = [
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
  ]

  const monthDayOptions = [
    { value: 1, label: 'Primeiro dia do mês seguinte' },
    { value: 0, label: 'Último dia do mês' },
  ]

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Notificações WhatsApp</h1>
          <p className="page-subtitle">Configure os resumos financeiros automáticos enviados ao seu WhatsApp.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 720 }}>

        {/* WhatsApp number */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(37,211,102,0.12)',
              border: '1px solid rgba(37,211,102,0.25)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#25D366',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.7A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Número WhatsApp</h2>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Insira o número que receberá os resumos
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="whatsapp-number">
              Número com DDD (ex: 11999999999)
            </label>
            <input
              id="whatsapp-number"
              type="tel"
              className="input"
              placeholder="11999999999"
              value={settings.whatsapp_number}
              onChange={e => setSettings(s => ({ ...s, whatsapp_number: e.target.value.replace(/\D/g, '') }))}
              maxLength={13}
            />
          </div>
        </div>

        {/* Daily Summary */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: settings.daily_summary_enabled ? '1.25rem' : 0 }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{
                width: 40, height: 40,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Resumo Diário</h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Entradas, saídas e resultado do dia
                </p>
              </div>
            </div>
            <Toggle
              id="daily-enabled-toggle"
              checked={settings.daily_summary_enabled}
              onChange={v => setSettings(s => ({ ...s, daily_summary_enabled: v }))}
            />
          </div>

          {settings.daily_summary_enabled && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="daily-hour-select">Horário de envio</label>
                <Select
                  id="daily-hour-select"
                  value={settings.daily_send_hour}
                  onChange={v => setSettings(s => ({ ...s, daily_send_hour: v }))}
                  options={hourOptions}
                />
              </div>
              <button
                id="preview-daily-btn"
                className="btn btn-ghost"
                onClick={() => setPreview('daily')}
                style={{ marginTop: '1.25rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Ver preview
              </button>
            </div>
          )}
        </div>

        {/* Weekly Summary */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: settings.weekly_summary_enabled ? '1.25rem' : 0 }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{
                width: 40, height: 40,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6366f1',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Resumo Semanal</h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Padrões e comportamento financeiro da semana
                </p>
              </div>
            </div>
            <Toggle
              id="weekly-enabled-toggle"
              checked={settings.weekly_summary_enabled}
              onChange={v => setSettings(s => ({ ...s, weekly_summary_enabled: v }))}
            />
          </div>

          {settings.weekly_summary_enabled && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="weekly-day-select">Dia de envio</label>
                <Select
                  id="weekly-day-select"
                  value={settings.weekly_send_day}
                  onChange={v => setSettings(s => ({ ...s, weekly_send_day: v }))}
                  options={weekDayOptions}
                />
              </div>
              <button
                id="preview-weekly-btn"
                className="btn btn-ghost"
                onClick={() => setPreview('weekly')}
                style={{ marginTop: '1.25rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Ver preview
              </button>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: settings.monthly_summary_enabled ? '1.25rem' : 0 }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{
                width: 40, height: 40,
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-amber)',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Fechamento Mensal</h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Relatório executivo completo do mês
                </p>
              </div>
            </div>
            <Toggle
              id="monthly-enabled-toggle"
              checked={settings.monthly_summary_enabled}
              onChange={v => setSettings(s => ({ ...s, monthly_summary_enabled: v }))}
            />
          </div>

          {settings.monthly_summary_enabled && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="monthly-day-select">Quando enviar</label>
                <Select
                  id="monthly-day-select"
                  value={settings.monthly_send_day}
                  onChange={v => setSettings(s => ({ ...s, monthly_send_day: v }))}
                  options={monthDayOptions}
                />
              </div>
              <button
                id="preview-monthly-btn"
                className="btn btn-ghost"
                onClick={() => setPreview('monthly')}
                style={{ marginTop: '1.25rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Ver preview
              </button>
            </div>
          )}
        </div>

        {/* Financial Health Reference */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
            Status de Saúde Financeira
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
            Indicador que aparece em todos os resumos, calculado em tempo real.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            <HealthBadge emoji="🟢" label="Saudável" color="#10b981" />
            <HealthBadge emoji="🟡" label="Moderado" color="#f59e0b" />
            <HealthBadge emoji="🔴" label="Atenção necessária" color="#ef4444" />
          </div>
        </div>

        {/* Save */}
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            id="save-settings-btn"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...
              </span>
            ) : saved ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Salvo!
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                Salvar configurações
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {preview && <PreviewModal type={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
