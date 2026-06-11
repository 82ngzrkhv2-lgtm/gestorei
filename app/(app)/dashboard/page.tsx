'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getMonthStart, getMonthEnd } from '@/lib/utils'
import type { Account, Transaction } from '@/types/database'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { useSearchParams, useRouter } from 'next/navigation'
import QuickAddModal from '@/components/transactions/QuickAddModal'
import { COPY } from '@/lib/copy'
import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'
import { usePrivacy } from '@/lib/contexts/PrivacyContext'

export default function DashboardPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('')
  const [retentionMessage, setRetentionMessage] = useState(COPY.dashboard.retention.default)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const { isPrivate, togglePrivacy } = usePrivacy()

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcomeModal(true)
    }
  }, [searchParams])

  const loadData = useCallback(async () => {
    const start = getMonthStart()
    const end = getMonthEnd()

    const txQuery = supabase.from('transactions')
      .select('*, account:accounts!account_id(name,color,icon), category:categories(name,color)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    const [
      { data: accs },
      { data: txAll },
      { data: { user } }
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).order('name'),
      txQuery,
      supabase.auth.getUser(),
    ])

    if (accs) setAccounts(accs)
    
    if (txAll) {
      setRecentTx(txAll.slice(0, 5) as unknown as Transaction[])
      
      const monthTxs = txAll.filter(t => t.date >= start && t.date <= end)
      setMonthIncome(monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))
      setMonthExpenses(monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))
    }

    if (user?.email) setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0])
    
    // Retention Logic (Hábitos)
    if (txAll && txAll.length > 0) {
      const lastTxDate = new Date(txAll[0].created_at || txAll[0].date)
      const diffMs = Date.now() - lastTxDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        setRetentionMessage(COPY.dashboard.retention.done_today)
      } else if (diffDays > 2) {
        setRetentionMessage(COPY.dashboard.retention.idle_few_days)
      } else {
        setRetentionMessage(COPY.dashboard.retention.default)
      }
    } else {
      setRetentionMessage(COPY.dashboard.retention.first_day)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { 
    loadData() 
    trackEvent('dashboard_viewed')
  }, [loadData])

  useEffect(() => {
    const h = new Date().getHours()
    const baseGreeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
    setGreeting(baseGreeting)
  }, [])

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="skeleton" style={{ height: 160, borderRadius: 24 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* ── Top Section (Mês Atual) ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Seu mês até agora
            </p>
          </div>
          <button
            onClick={togglePrivacy}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: '0.25rem', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {isPrivate ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        
        <h1 className="money-value" style={{ 
          fontSize: 'clamp(2.5rem, 8vw, 4rem)', 
          fontWeight: 800, 
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: (monthIncome - monthExpenses) >= 0 ? 'var(--text-primary)' : 'var(--text-primary)'
        }}>
          {formatCurrency(monthIncome - monthExpenses)}
        </h1>

        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem', fontWeight: 500, marginTop: '0.25rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Entrou <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(monthIncome)}</span>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Saiu <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(monthExpenses)}</span>
          </span>
        </div>
      </section>

      {/* ── Núcleos (Accounts) ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Núcleos</h2>
          <Link href="/accounts" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Ver todos
          </Link>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
          gap: 'var(--space-3)' 
        }}>
          {accounts.map(acc => (
            <div key={acc.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{acc.name}</span>
              </div>
              <p className="money-value" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {formatCurrency(Number(acc.balance))}
              </p>
            </div>
          ))}
          
          <Link href="/accounts" style={{ textDecoration: 'none', display: 'flex' }}>
            <div className="glass-card" style={{ 
              flex: 1, padding: '1.25rem', borderRadius: 'var(--radius-lg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed var(--border)', background: 'transparent', gap: '0.5rem'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Últimas Movimentações ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Últimas movimentações</h2>
          <Link href="/transactions" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Ver extrato
          </Link>
        </div>
        
        <RecentTransactions transactions={recentTx} onAdd={() => {}} hideHeader={true} />
      </section>

      {showWelcomeModal && (
        <QuickAddModal 
          onClose={() => {
            setShowWelcomeModal(false)
            router.replace('/dashboard')
          }} 
          onSuccess={() => {
            setShowWelcomeModal(false)
            router.replace('/dashboard')
            loadData()
          }} 
        />
      )}
    </div>
  )
}
