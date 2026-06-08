'use client'

import { useEffect, useState } from 'react'
import type { Account, Alert } from '@/types/database'
import { runAlertsEngine } from '@/lib/alerts-engine'

interface Props {
  accounts: Account[]
  monthIncome: number
  monthExpenses: number
  alertRules: Alert[]
}

export default function AlertsBanner({ accounts, monthIncome, monthExpenses, alertRules }: Props) {
  const [alerts, setAlerts] = useState<ReturnType<typeof runAlertsEngine>>([])

  useEffect(() => {
    const checks = accounts.map(a => ({
      accountId: a.id,
      accountName: a.name,
      balance: Number(a.balance),
      monthlyIncome: monthIncome,
      monthlyExpenses: monthExpenses,
      lastMonthExpenses: 0, // Would need prev month data for full check
      goals: [],
      alertRules: alertRules.map(r => ({ type: r.type, threshold: r.threshold ? Number(r.threshold) : null, accountId: r.account_id })),
    }))
    setAlerts(runAlertsEngine(checks))
  }, [accounts, monthIncome, monthExpenses, alertRules])

  if (alerts.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
      {alerts.slice(0, 3).map((alert, i) => (
        <div key={i} className={`alert-banner ${alert.severity === 'critical' ? 'alert-critical' : 'alert-warning'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  )
}
