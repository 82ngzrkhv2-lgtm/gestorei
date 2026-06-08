'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getDateRangeForPeriod, PERIOD_LABELS, type PeriodFilter } from '@/lib/utils'
import type { Account, Transaction, Alert } from '@/types/database'
import BalanceChart from '@/components/dashboard/BalanceChart'
import StatsCard from '@/components/dashboard/StatsCard'
import AccountSummaryCard from '@/components/dashboard/AccountSummaryCard'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import AlertsBanner from '@/components/dashboard/AlertsBanner'
import QuickAddModal from '@/components/transactions/QuickAddModal'
import Link from 'next/link'

export default function DashboardPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [alertRules, setAlertRules] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [quickAdd, setQuickAdd] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>('current_month')

  const loadData = useCallback(async () => {
    const { start, end } = getDateRangeForPeriod(period)

    let txQuery = supabase.from('transactions')
      .select('*, account:accounts(name,color,icon), category:categories(name,color)')
      .order('created_at', { ascending: false })

    if (start && end) {
      txQuery = txQuery.gte('date', start).lte('date', end)
    }

    const [{ data: accs }, { data: txAll }, { data: alerts }, { data: { user } }] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      txQuery,
      supabase.from('alerts').select('*').eq('is_active', true),
      supabase.auth.getUser(),
    ])

    if (accs) setAccounts(accs)
    if (txAll) {
      setRecentTx(txAll.slice(0, 8) as unknown as Transaction[])
      setMonthIncome(txAll.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))
      setMonthExpenses(txAll.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))
    }
    if (alerts) setAlertRules(alerts)
    if (user?.email) setUserName(user.email.split('@')[0])
    setLoading(false)
  }, [supabase, period])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')
  }, [])

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const netPL = monthIncome - monthExpenses
  const savingsRate = monthIncome > 0 ? Math.round((netPL / monthIncome) * 100) : 0
  const periodLabel = getDateRangeForPeriod(period).label

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      {/* ── Hero Header ── */}
      <div style={{
        background: totalBalance >= 0 ? 'var(--accent)' : 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 1.25rem',
        marginBottom: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: totalBalance >= 0 ? '0 4px 24px rgba(16, 185, 129, 0.25)' : 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        {/* Decorative elements */}
        {totalBalance >= 0 && (
          <div style={{
            position: 'absolute', top: -30, right: -20,
            width: 150, height: 150, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: totalBalance >= 0 ? 'rgba(0,0,0,0.1)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalBalance >= 0 ? '#000' : 'var(--text-primary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <span style={{ fontSize: '0.8125rem', color: totalBalance >= 0 ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {greeting}{userName ? `, ${userName}` : ''} 👋
              </span>
            </div>
            
            <h1 style={{
              fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em',
              color: totalBalance >= 0 ? '#000' : 'var(--accent-red)',
              lineHeight: 1.1, marginBottom: '0.25rem',
            }}>
              {formatCurrency(totalBalance)}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: totalBalance >= 0 ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', fontWeight: 500 }}>
              Patrimônio total · {accounts.length} núcleo{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            id="dashboard-add-transaction"
            onClick={() => setQuickAdd(true)}
            style={{ 
              background: totalBalance >= 0 ? '#000' : 'var(--accent)', 
              color: totalBalance >= 0 ? '#fff' : '#000',
              border: 'none', borderRadius: 8, padding: '0.625rem 1rem',
              fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Lançar
          </button>
          
          <Link href="/accounts" style={{ textDecoration: 'none' }}>
            <button style={{ 
              background: totalBalance >= 0 ? 'rgba(0,0,0,0.05)' : 'var(--bg-card)', 
              color: totalBalance >= 0 ? 'rgba(0,0,0,0.8)' : 'var(--text-primary)',
              border: totalBalance >= 0 ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--glass-border)', 
              borderRadius: 8, padding: '0.625rem 1rem',
              fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = totalBalance >= 0 ? 'rgba(0,0,0,0.1)' : 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = totalBalance >= 0 ? 'rgba(0,0,0,0.05)' : 'var(--bg-card)'}
            >
              Núcleos
            </button>
          </Link>
        </div>
      </div>

      {/* ── Alerts ── */}
      {alertRules.length > 0 && (
        <AlertsBanner accounts={accounts} monthExpenses={monthExpenses} monthIncome={monthIncome} alertRules={alertRules} />
      )}

      {/* ── Period Selector & Stats ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Resumo <span style={{ color: 'var(--text-muted)' }}>{periodLabel}</span></h2>
        
        <select 
          className="input" 
          value={period} 
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          style={{ width: 'auto', padding: '0.5rem 2.5rem 0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {Object.entries(PERIOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1.25rem' }}>
        <StatsCard
          label="Entradas"
          value={formatCurrency(monthIncome)}
          subtitle={periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>}
          color="var(--accent)"
          className="animate-fade-in"
        />
        <StatsCard
          label="Saídas"
          value={formatCurrency(monthExpenses)}
          subtitle={periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>}
          color="var(--accent-red)"
          className="animate-fade-in delay-1"
        />
        <StatsCard
          label="Resultado"
          value={formatCurrency(netPL)}
          subtitle={netPL >= 0 ? 'Saldo positivo ✓' : 'Saldo negativo'}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
          color={netPL >= 0 ? 'var(--accent)' : 'var(--accent-red)'}
          trend={netPL >= 0 ? 'up' : 'down'}
          className="animate-fade-in delay-2"
        />
        <StatsCard
          label="Taxa de Poupança"
          value={`${savingsRate}%`}
          subtitle={monthIncome > 0 ? 'Do que entrou' : 'Sem entradas'}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M12 6v6l4 2"/></svg>}
          color="var(--accent-blue)"
          className="animate-fade-in delay-3"
        />
      </div>

      {/* ── Chart + Accounts ── */}
      <div className="grid-dashboard" style={{ marginBottom: '1rem' }}>
        <BalanceChart />

        {/* Accounts panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Núcleos</span>
            <Link href="/accounts" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todos
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </Link>
          </div>
          {accounts.map(a => <AccountSummaryCard key={a.id} account={a} />)}
          {accounts.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Nenhuma conta ainda.
            </div>
          )}
          <Link href="/accounts" style={{ textDecoration: 'none', marginTop: '0.25rem' }}>
            <div style={{
              padding: '0.625rem', border: '1px dashed var(--glass-border)', borderRadius: 10,
              color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              + Novo núcleo
            </div>
          </Link>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <RecentTransactions transactions={recentTx} onAdd={() => setQuickAdd(true)} />

      {quickAdd && (
        <QuickAddModal onClose={() => setQuickAdd(false)} onSuccess={loadData} />
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)' }} />
      <div className="grid-stats">
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--radius)' }} />)}
      </div>
      <div className="grid-dashboard">
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
        </div>
      </div>
    </div>
  )
}
