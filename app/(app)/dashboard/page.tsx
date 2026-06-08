'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getDateRangeForPeriod, PERIOD_LABELS, getMonthStart, getMonthEnd, getAccountTypeLabel, type PeriodFilter } from '@/lib/utils'
import type { Account, Transaction, Alert, FinancialLimit, FinancialGoal, UserPreferences } from '@/types/database'
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
  const [limits, setLimits] = useState<FinancialLimit[]>([])
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [alertRules, setAlertRules] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [quickAdd, setQuickAdd] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>('current_month')

  // Dashboard customization states
  const [selectedView, setSelectedView] = useState<string>('consolidated')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [prefModalOpen, setPrefModalOpen] = useState(false)
  const [prefDefaultView, setPrefDefaultView] = useState('consolidated')
  const [prefRemember, setPrefRemember] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)

  const loadData = useCallback(async () => {
    const { start, end } = getDateRangeForPeriod(period)

    let txQuery = supabase.from('transactions')
      .select('*, account:accounts!account_id(name,color,icon), category:categories(name,color)')
      .order('created_at', { ascending: false })

    if (start && end) {
      txQuery = txQuery.gte('date', start).lte('date', end)
    }

    if (selectedView !== 'consolidated') {
      txQuery = txQuery.or(`account_id.eq.${selectedView},source_account_id.eq.${selectedView},destination_account_id.eq.${selectedView}`)
    }

    let alertsQuery = supabase.from('alerts').select('*').eq('is_active', true)
    if (selectedView !== 'consolidated') {
      alertsQuery = alertsQuery.or(`account_id.is.null,account_id.eq.${selectedView}`)
    }

    let limitsQuery = supabase.from('financial_limits').select('*, account:accounts(name,color), category:categories(name,color,icon)')
    if (selectedView !== 'consolidated') {
      limitsQuery = limitsQuery.or(`account_id.is.null,account_id.eq.${selectedView}`)
    }

    let goalsQuery = supabase.from('financial_goals').select('*, account:accounts(name,color)').eq('status', 'in_progress').order('created_at', { ascending: false }).limit(5)
    if (selectedView !== 'consolidated') {
      goalsQuery = goalsQuery.or(`account_id.eq.${selectedView},linked_account_id.eq.${selectedView}`)
    }

    const [{ data: accs }, { data: txAll }, { data: alerts }, { data: lims }, { data: gls }, { data: { user } }] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      txQuery,
      alertsQuery,
      limitsQuery,
      goalsQuery,
      supabase.auth.getUser(),
    ])

    const accountsList = accs || []
    if (accs) setAccounts(accountsList)
    
    // Calculate dashboard statistics (transfers are neutral)
    if (txAll) {
      setRecentTx(txAll.slice(0, 8) as unknown as Transaction[])
      setMonthIncome(txAll.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))
      setMonthExpenses(txAll.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))
    }
    
    if (alerts) setAlertRules(alerts)

    if (gls) {
      const hasCategoryGoal = gls.some(g => g.tracking_type === 'automatic' && g.linked_category_id)
      let catTxs: { category_id: string; amount: number; type: string }[] = []
      if (hasCategoryGoal) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('category_id, amount, type')
          .is('category_id', 'not.null')
        catTxs = txs || []
      }

      const resolvedGoals = gls.map(goal => {
        let current = Number(goal.current_amount)
        if (goal.tracking_type === 'automatic') {
          if (goal.linked_account_id) {
            const acc = accountsList.find(a => a.id === goal.linked_account_id)
            current = acc ? Number(acc.balance) : 0
          } else if (goal.linked_category_id) {
            const txsForCat = catTxs.filter(t => t.category_id === goal.linked_category_id)
            const income = txsForCat.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
            const expense = txsForCat.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
            current = Math.max(0, income - expense)
          }
        }
        return {
          ...goal,
          current_amount: current,
          status: current >= Number(goal.target_amount) ? 'completed' : 'in_progress'
        }
      })
      setGoals(resolvedGoals as unknown as FinancialGoal[])
    }

    // Calculate Limits usage on the fly for real-time accuracy in the dashboard
    if (lims) {
      const startMonth = getMonthStart()
      const endMonth = getMonthEnd()
      
      let monthTxsQuery = supabase
        .from('transactions')
        .select('account_id, category_id, amount')
        .eq('type', 'expense')
        .gte('date', startMonth)
        .lte('date', endMonth)

      if (selectedView !== 'consolidated') {
        monthTxsQuery = monthTxsQuery.eq('account_id', selectedView)
      }

      const { data: monthTxs } = await monthTxsQuery
      const expList = monthTxs || []

      lims.forEach(limit => {
        let usage = 0
        if (!limit.account_id && !limit.category_id) {
          usage = expList.reduce((sum, tx) => sum + Number(tx.amount), 0)
        } else if (limit.account_id && !limit.category_id) {
          usage = expList.filter(tx => tx.account_id === limit.account_id).reduce((sum, tx) => sum + Number(tx.amount), 0)
        } else if (!limit.account_id && limit.category_id) {
          usage = expList.filter(tx => tx.category_id === limit.category_id).reduce((sum, tx) => sum + Number(tx.amount), 0)
        } else if (limit.account_id && limit.category_id) {
          usage = expList.filter(tx => tx.account_id === limit.account_id && tx.category_id === limit.category_id).reduce((sum, tx) => sum + Number(tx.amount), 0)
        }
        limit.current_usage = usage
      })
      setLimits(lims as unknown as FinancialLimit[])
    }

    if (user?.email) setUserName(user.email.split('@')[0])
    setLoading(false)
  }, [supabase, period, selectedView])

  // Load preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      const localView = localStorage.getItem('gestorei_last_dashboard_view')
      const localRemember = localStorage.getItem('gestorei_remember_last_view') !== 'false'
      const localDefault = localStorage.getItem('gestorei_default_dashboard_view') || 'consolidated'

      let initialView = 'consolidated'
      if (localRemember && localView) {
        initialView = localView
      } else {
        initialView = localDefault
      }
      setSelectedView(initialView)
      setPrefDefaultView(localDefault)
      setPrefRemember(localRemember)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prefData } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (prefData) {
            setPreferences(prefData)
            setPrefDefaultView(prefData.default_dashboard_view)
            setPrefRemember(prefData.remember_last_view)
            
            const dbView = prefData.remember_last_view && prefData.last_dashboard_view 
              ? prefData.last_dashboard_view 
              : prefData.default_dashboard_view
            
            setSelectedView(dbView)
            
            localStorage.setItem('gestorei_default_dashboard_view', prefData.default_dashboard_view)
            localStorage.setItem('gestorei_remember_last_view', String(prefData.remember_last_view))
            if (prefData.last_dashboard_view) {
              localStorage.setItem('gestorei_last_dashboard_view', prefData.last_dashboard_view)
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar preferências do banco, usando fallback local:', err)
      }
    }
    loadPreferences()
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')
  }, [])

  const handleViewChange = async (view: string) => {
    setLoading(true)
    setSelectedView(view)
    localStorage.setItem('gestorei_last_dashboard_view', view)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const remember = preferences ? preferences.remember_last_view : true
        if (remember) {
          await supabase.from('user_preferences').upsert({
            user_id: user.id,
            last_dashboard_view: view,
            updated_at: new Date().toISOString()
          })
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar última visão no banco:', err)
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const selectedAccount = accounts.find(a => a.id === selectedView)
  const activeBalance = selectedAccount ? Number(selectedAccount.balance) : totalBalance
  const netPL = monthIncome - monthExpenses
  const savingsRate = monthIncome > 0 ? Math.round((netPL / monthIncome) * 100) : 0
  const periodLabel = getDateRangeForPeriod(period).label

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      {/* ── Context Selector Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        padding: '0.5rem 0.75rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Visão selector dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              padding: '0.375rem 0.625rem',
              borderRadius: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              {selectedView === 'consolidated' ? (
                <>
                  <span style={{ color: 'var(--accent)' }}>🌍</span>
                  Patrimônio Total
                </>
              ) : (
                <>
                  <span style={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    background: selectedAccount?.color || 'var(--accent)',
                    display: 'inline-block' 
                  }} />
                  {selectedAccount?.name || 'Carregando...'}
                </>
              )}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay back to close */}
              <div onClick={() => setDropdownOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
              
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                zIndex: 999,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-hover)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-lg)',
                padding: '0.375rem',
                minWidth: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <button
                  onClick={() => { handleViewChange('consolidated'); setDropdownOpen(false) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    borderRadius: 8,
                    background: selectedView === 'consolidated' ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: selectedView === 'consolidated' ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = selectedView === 'consolidated' ? 'var(--bg-hover)' : 'transparent'}
                >
                  <span>🌍</span> Visão Consolidada
                </button>
                
                <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
                
                {accounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { handleViewChange(a.id); setDropdownOpen(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      borderRadius: 8,
                      background: selectedView === a.id ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: selectedView === a.id ? 700 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedView === a.id ? 'var(--bg-hover)' : 'transparent'}
                  >
                    <span style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: '50%', 
                      background: a.color 
                    }} />
                    {a.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Preferences Cog */}
        <button
          onClick={() => setPrefModalOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      {/* ── Hero Header ── */}
      <div style={{
        background: activeBalance >= 0 ? 'var(--accent)' : 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 1.25rem',
        marginBottom: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: activeBalance >= 0 ? '0 4px 24px rgba(16, 185, 129, 0.25)' : 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        {/* Decorative elements */}
        {activeBalance >= 0 && (
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
              <div style={{ width: 32, height: 32, borderRadius: 8, background: activeBalance >= 0 ? 'rgba(0,0,0,0.1)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeBalance >= 0 ? '#000' : 'var(--text-primary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <span style={{ fontSize: '0.8125rem', color: activeBalance >= 0 ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {greeting}{userName ? `, ${userName}` : ''} 👋
              </span>
            </div>
            
            <h1 style={{
              fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em',
              color: activeBalance >= 0 ? '#000' : 'var(--accent-red)',
              lineHeight: 1.1, marginBottom: '0.25rem',
            }}>
              {formatCurrency(activeBalance)}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: activeBalance >= 0 ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', fontWeight: 500 }}>
              {selectedView === 'consolidated' 
                ? `Patrimônio total · ${accounts.length} núcleos` 
                : `Contexto: ${selectedAccount?.name} · ${getAccountTypeLabel(selectedAccount?.type || '')}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            id="dashboard-add-transaction"
            onClick={() => setQuickAdd(true)}
            style={{ 
              background: activeBalance >= 0 ? '#000' : 'var(--accent)', 
              color: activeBalance >= 0 ? '#fff' : '#000',
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
              background: activeBalance >= 0 ? 'rgba(0,0,0,0.05)' : 'var(--bg-card)', 
              color: activeBalance >= 0 ? 'rgba(0,0,0,0.8)' : 'var(--text-primary)',
              border: activeBalance >= 0 ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--glass-border)', 
              borderRadius: 8, padding: '0.625rem 1rem',
              fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = activeBalance >= 0 ? 'rgba(0,0,0,0.1)' : 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = activeBalance >= 0 ? 'rgba(0,0,0,0.05)' : 'var(--bg-card)'}
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
      <div className="grid-dashboard" style={{ marginBottom: '1.25rem' }}>
        <BalanceChart accountId={selectedView !== 'consolidated' ? selectedView : null} />

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

      {/* ── Limites & Metas Dashboard Widgets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* Limits Widget Card */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 4, height: 16, background: 'var(--accent-red)', borderRadius: 4 }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Limites Críticos</span>
            </div>
            <Link href="/limits" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Ajustar limites
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1, justifyContent: limits.length === 0 ? 'center' : 'flex-start' }}>
            {limits.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                Nenhum limite mensal definido.
              </p>
            ) : (
              limits
                .map(l => {
                  const spent = Number(l.current_usage)
                  const limitVal = Number(l.monthly_limit)
                  const pct = limitVal > 0 ? (spent / limitVal) * 100 : 0
                  return { ...l, pct }
                })
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 3)
                .map(limit => {
                  const spent = Number(limit.current_usage)
                  const limitVal = Number(limit.monthly_limit)
                  const pct = Math.min(100, limit.pct)
                  const over = spent > limitVal
                  const warning = limit.pct >= limit.alert_threshold && !over
                  const statusColor = over ? 'var(--accent-red)' : warning ? 'var(--accent-amber)' : 'var(--accent)'
                  const barClass = over ? 'bg-danger' : warning ? 'bg-warning' : 'bg-safe'
                  const title = limit.category?.name ? `Categoria: ${limit.category.name}` : limit.account?.name ? `Núcleo: ${limit.account.name}` : 'Limite Global'

                  return (
                    <div key={limit.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 500 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{title}</span>
                        <span style={{ color: statusColor, fontWeight: 700 }}>{Math.round(limit.pct)}%</span>
                      </div>
                      <div className="progress-bar-track" style={{ height: 6 }}>
                        <div className={`progress-bar-fill ${barClass}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                        <span>Gasto: {formatCurrency(spent)} / {formatCurrency(limitVal)}</span>
                        <span>{over ? 'Ultrapassado!' : `Resta ${formatCurrency(limitVal - spent)}`}</span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* Goals Widget Card */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 4, height: 16, background: 'var(--accent-blue)', borderRadius: 4 }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Metas em Andamento</span>
            </div>
            <Link href="/goals" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Ver metas
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1, justifyContent: goals.length === 0 ? 'center' : 'flex-start' }}>
            {goals.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                Nenhuma meta ativa cadastrada.
              </p>
            ) : (
              goals.slice(0, 3).map(goal => {
                const target = Number(goal.target_amount)
                const current = Number(goal.current_amount)
                const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0)

                const today = new Date()
                today.setHours(0,0,0,0)
                const end = goal.end_date ? new Date(goal.end_date) : null
                let dateLabel = 'Sem prazo'
                if (end) {
                  const daysRemaining = Math.max(0, Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24)))
                  dateLabel = daysRemaining > 0 ? `Faltam ${daysRemaining} dias` : 'Prazo encerrado'
                }

                return (
                  <div key={goal.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 500 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {goal.title}
                        {goal.tracking_type === 'automatic' && (
                          <span style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent)', padding: '2px 4px', borderRadius: 4 }} title="Sincronizada automaticamente">Auto 🔄</span>
                        )}
                      </span>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar-track" style={{ height: 6 }}>
                      <div className="progress-bar-fill bg-info" style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      <span>Guardado: {formatCurrency(current)} / {formatCurrency(target)}</span>
                      <span>{dateLabel}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* ── Recent Transactions ── */}
      <RecentTransactions transactions={recentTx} onAdd={() => setQuickAdd(true)} />

      {quickAdd && (
        <QuickAddModal onClose={() => setQuickAdd(false)} onSuccess={loadData} />
      )}

      {/* ── Preferences Modal ── */}
      {prefModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div 
            className="glass-card animate-scale-in"
            style={{
              width: '100%', maxWidth: 440, padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
              border: '1px solid var(--border-hover)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Preferências do Dashboard</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ajuste a visualização padrão inicial</p>
              </div>
              <button 
                onClick={() => setPrefModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label" style={{ marginBottom: 6 }}>Visão Inicial Padrão</label>
                <select 
                  className="input" 
                  value={prefDefaultView} 
                  onChange={e => setPrefDefaultView(e.target.value)}
                >
                  <option value="consolidated">Visão Consolidada (Patrimônio Total)</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Qual núcleo financeiro ou visão abrirá automaticamente ao entrar no app.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Lembrar Última Visão</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Ao trocar de visão no painel, salvá-la como ativa</span>
                </div>
                <button
                  onClick={() => setPrefRemember(!prefRemember)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefRemember ? 'var(--accent)' : 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    padding: 0,
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: prefRemember ? 22 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setPrefModalOpen(false)}
                className="btn"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  setSavingPrefs(true)
                  try {
                    localStorage.setItem('gestorei_default_dashboard_view', prefDefaultView)
                    localStorage.setItem('gestorei_remember_last_view', String(prefRemember))

                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                      await supabase.from('user_preferences').upsert({
                        user_id: user.id,
                        default_dashboard_view: prefDefaultView,
                        remember_last_view: prefRemember,
                        updated_at: new Date().toISOString()
                      })
                    }
                    
                    setPreferences({
                      user_id: user?.id || '',
                      default_dashboard_view: prefDefaultView,
                      remember_last_view: prefRemember,
                      last_dashboard_view: selectedView
                    })
                    
                    if (!prefRemember) {
                      setSelectedView(prefDefaultView)
                      localStorage.setItem('gestorei_last_dashboard_view', prefDefaultView)
                    }

                    setPrefModalOpen(false)
                  } catch (err) {
                    console.error('Erro ao salvar preferências:', err)
                    setPrefModalOpen(false)
                  } finally {
                    setSavingPrefs(false)
                  }
                }}
                className="btn btn-primary"
                disabled={savingPrefs}
              >
                {savingPrefs ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
          </div>
        </div>
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
