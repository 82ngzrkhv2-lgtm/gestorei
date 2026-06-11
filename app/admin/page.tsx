'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  name: string | null
  email: string | null
  status: 'active' | 'suspended' | 'blocked'
  created_at: string
  last_sign_in_at: string | null
  last_activity_at: string | null
  user_roles: { role: string }[]
  subscriptions: { status: string; plan_name: string | null; trial_ends_at: string | null }[]
}

interface HealthLog {
  job_name: string
  status: 'ok' | 'error' | 'warning'
  duration_ms: number
  records_processed: number
  executed_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(d: string | null): string {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'Agora'
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Ativo' },
  suspended: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Suspenso' },
  blocked:   { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Bloqueado' },
}

const HEALTH_COLORS: Record<string, string> = { ok: '#10b981', error: '#ef4444', warning: '#f59e0b' }
const HEALTH_ICONS:  Record<string, string> = { ok: '🟢', error: '🔴', warning: '🟡' }

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
      <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800, color: color ?? 'var(--text-primary)' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [health, setHealth]     = useState<HealthLog[]>([])
  const [adminRole, setAdminRole] = useState<string>('admin')
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [kpis, setKpis]         = useState({ totalTransactions: 0, activeD1: 0, activeD7: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, healthRes, kpisRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/health'),
        fetch('/api/admin/kpis')
      ])
      if (usersRes.ok) {
        const d = await usersRes.json()
        setUsers(d.users ?? [])
        setAdminRole(d.adminRole ?? 'admin')
      }
      if (healthRes.ok) {
        const h = await healthRes.json()
        setHealth(h.logs ?? [])
      }
      if (kpisRes.ok) {
        setKpis(await kpisRes.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const doAction = useCallback(async (userId: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(`${userId}:${action}`)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.ok) await load()
      else alert(`Erro: ${(await res.json()).error}`)
    } finally {
      setActionLoading(null)
    }
  }, [load])

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const total     = users.length
  const active    = users.filter(u => u.status === 'active').length
  const suspended = users.filter(u => u.status === 'suspended').length
  const blocked   = users.filter(u => u.status === 'blocked').length
  const paying    = users.filter(u => u.subscriptions?.[0]?.status === 'active').length
  const trial     = users.filter(u => u.subscriptions?.[0]?.status === 'trial').length

  const filtered  = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Central Operacional</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>Visão geral da plataforma Gestorei</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
        <KpiCard label="Total usuários" value={total} />
        <KpiCard label="Ativos D1"      value={kpis.activeD1}    color="#10b981" />
        <KpiCard label="Ativos D7"      value={kpis.activeD7}    color="#10b981" />
        <KpiCard label="Retenção (D7)"  value={total > 0 ? Math.round((kpis.activeD7 / total) * 100) : 0} sub="%" color="#6366f1" />
        <KpiCard label="Movimentações"  value={kpis.totalTransactions} color="#f59e0b" />
        <KpiCard label="Suspensos"      value={suspended} color="#f59e0b" />
        <KpiCard label="Bloqueados"     value={blocked}   color="#ef4444" />
      </div>

      {/* Status Operacional */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>Status dos Cron Jobs</h2>
        {health.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nenhum log de execução ainda. Os crons ainda não rodaram.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {health.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: 10, border: `1px solid ${HEALTH_COLORS[h.status]}25` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{HEALTH_ICONS[h.status]}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{h.job_name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{relTime(h.executed_at)} · {h.records_processed} registros · {h.duration_ms}ms</p>
                  </div>
                </div>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, background: `${HEALTH_COLORS[h.status]}18`, color: HEALTH_COLORS[h.status] }}>
                  {h.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Usuários ({filtered.length})</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="input"
            style={{ maxWidth: 280, height: 38 }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                {['Usuário', 'Status', 'Plano', 'Cadastro', 'Última atividade', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const statusCfg = STATUS_COLORS[u.status] ?? STATUS_COLORS.active
                const plan      = u.subscriptions?.[0]
                const role      = u.user_roles?.[0]?.role ?? 'user'
                const key       = `${u.id}:`
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.875rem 0.75rem' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{u.name ?? '—'}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</p>
                      {role !== 'user' && <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6366f1' }}>{role.toUpperCase()}</span>}
                    </td>
                    <td style={{ padding: '0.875rem 0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.625rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, background: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 0.75rem', color: 'var(--text-secondary)' }}>
                      {plan ? `${plan.plan_name ?? plan.status}` : 'Gratuito'}
                    </td>
                    <td style={{ padding: '0.875rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fmtDate(u.created_at)}
                    </td>
                    <td style={{ padding: '0.875rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {relTime(u.last_activity_at ?? u.last_sign_in_at)}
                    </td>
                    <td style={{ padding: '0.875rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {u.status !== 'active' && (
                          <button disabled={!!actionLoading} onClick={() => doAction(u.id, 'activate')} className="btn btn-ghost" style={{ fontSize: '0.75rem', height: 28, padding: '0 0.625rem', color: '#10b981' }}>
                            {actionLoading === `${key}activate` ? '...' : 'Ativar'}
                          </button>
                        )}
                        {u.status === 'active' && (
                          <button disabled={!!actionLoading} onClick={() => doAction(u.id, 'suspend')} className="btn btn-ghost" style={{ fontSize: '0.75rem', height: 28, padding: '0 0.625rem', color: '#f59e0b' }}>
                            {actionLoading === `${key}suspend` ? '...' : 'Suspender'}
                          </button>
                        )}
                        {u.status !== 'blocked' && (
                          <button disabled={!!actionLoading} onClick={() => { if (confirm(`Bloquear ${u.email}?`)) doAction(u.id, 'block') }} className="btn btn-ghost" style={{ fontSize: '0.75rem', height: 28, padding: '0 0.625rem', color: '#ef4444' }}>
                            {actionLoading === `${key}block` ? '...' : 'Bloquear'}
                          </button>
                        )}
                        <button disabled={!!actionLoading} onClick={() => doAction(u.id, 'grant_trial')} className="btn btn-ghost" style={{ fontSize: '0.75rem', height: 28, padding: '0 0.625rem' }}>
                          Trial
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
