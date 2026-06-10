'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SummaryPayload } from '@/lib/notification-engine'
import dynamic from 'next/dynamic'
import DataCenter from './DataCenter'

const SummaryPopup = dynamic(() => import('@/components/shared/SummaryPopup'), { ssr: false })

// ─── Default settings ─────────────────────────────────────────────────────────

interface SummarySettings {
  daily_summary_enabled: boolean
  weekly_summary_enabled: boolean
  monthly_summary_enabled: boolean
  daily_send_hour: number
  weekly_send_day: number
  monthly_send_day: number
}

const DEFAULT_SETTINGS: SummarySettings = {
  daily_summary_enabled: true,
  weekly_summary_enabled: true,
  monthly_summary_enabled: true,
  daily_send_hour: 20,
  weekly_send_day: 6,
  monthly_send_day: 1,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SummaryType = 'daily' | 'weekly' | 'monthly'

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  type,
  onClose,
}: {
  type: SummaryType
  onClose: () => void
}) {
  const [payload, setPayload] = useState<SummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/summaries/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setPayload(data.payload as SummaryPayload)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [type])

  const typeLabels: Record<SummaryType, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  }

  if (loading) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 400,
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(540px, 94vw)',
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            zIndex: 401,
            padding: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="spinner" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 400,
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(540px, 94vw)',
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            zIndex: 401,
            padding: '2rem',
          }}
        >
          <p style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
          <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: '1rem' }}>Fechar</button>
        </div>
      </>
    )
  }

  if (payload) {
    return (
      <SummaryPopup
        summaryId="preview"
        type={type}
        periodLabel={`Preview — Resumo ${typeLabels[type]}`}
        payload={payload}
        onDismiss={onClose}
      />
    )
  }

  return null
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<SummarySettings>(DEFAULT_SETTINGS)
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
        .upsert(
          { user_id: user.id, ...settings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )

      if (upsertError) throw upsertError

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }, [supabase, settings])

  // Hour options 16–23
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
          <h1 className="page-title">Resumos Financeiros</h1>
          <p className="page-subtitle">Configure os resumos automáticos que aparecem ao abrir o aplicativo.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 720 }}>

        {/* Info banner */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.875rem',
          }}
        >
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Os resumos são gerados automaticamente e exibidos como notificações ao abrir o app.
              O <strong>resumo diário</strong> aparece à noite, o <strong>semanal</strong> no fim de semana
              e o <strong>mensal</strong> no início de cada mês.
            </p>
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
                fontSize: '1.125rem',
              }}>
                📊
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Resumo Diário</h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Entradas, saídas, resultado e alertas do dia
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
                <label className="form-label" htmlFor="daily-hour-select">Horário de geração</label>
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
                fontSize: '1.125rem',
              }}>
                📈
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
                <label className="form-label" htmlFor="weekly-day-select">Dia de geração</label>
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
                fontSize: '1.125rem',
              }}>
                🏆
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
                <label className="form-label" htmlFor="monthly-day-select">Quando gerar</label>
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
            Indicador calculado em tempo real e exibido em todos os resumos.
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

        {/* --- Data Center / LGPD --- */}
        <DataCenter />

      </div>

      {/* Preview modal */}
      {preview && <PreviewModal type={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
