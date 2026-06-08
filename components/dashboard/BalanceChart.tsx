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

export default function BalanceChart() {
  const supabase = createClient()
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const months: MonthData[] = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

        const { data: txs } = await supabase
          .from('transactions')
          .select('type, amount')
          .gte('date', start)
          .lte('date', endStr)

        const income = (txs ?? []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const expenses = (txs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

        months.push({ month: label.charAt(0).toUpperCase() + label.slice(1), income, expenses })
      }

      setData(months)
      setLoading(false)
    }
    load()
  }, [supabase])

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
