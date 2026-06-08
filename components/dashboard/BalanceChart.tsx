'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthData {
  month: string
  income: number
  expenses: number
}

export default function BalanceChart({ accountId }: { accountId?: string | null }) {
  const supabase = createClient()
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      // First day of the month 5 months ago
      const startPeriod = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const startStr = `${startPeriod.getFullYear()}-${String(startPeriod.getMonth() + 1).padStart(2, '0')}-01`
      
      // Last day of the current month
      const endPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const endStr = `${endPeriod.getFullYear()}-${String(endPeriod.getMonth() + 1).padStart(2, '0')}-${String(endPeriod.getDate()).padStart(2, '0')}`

      let query = supabase
        .from('transactions')
        .select('type, amount, date')
        .gte('date', startStr)
        .lte('date', endStr)

      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: txs } = await query
      const transactionList = txs || []

      const months: MonthData[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1)
        
        const monthNum = d.getMonth()
        const yearNum = d.getFullYear()
        
        // Group and sum in memory (timezone-safe parsing)
        const monthTxs = transactionList.filter(t => {
          const parts = t.date.split('-')
          const txYear = parseInt(parts[0], 10)
          const txMonth = parseInt(parts[1], 10) - 1
          return txMonth === monthNum && txYear === yearNum
        })

        const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

        months.push({ month: formattedLabel, income, expenses })
      }

      setData(months)
      setLoading(false)
    }
    load()
  }, [supabase, accountId])

  if (loading) return <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius)' }} />

  return (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 4, height: 16, background: 'var(--accent-blue)', borderRadius: 4 }} />
          <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Fluxo (6 Meses)</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Entradas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Saídas</span>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === 'income' ? 'Entradas' : 'Saídas']}
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-md)' }}
              labelStyle={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ fontSize: 13, fontWeight: 700 }}
              cursor={{ stroke: 'var(--border-hover)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fill="url(#colorIncome)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
            <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fill="url(#colorExpenses)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
