import type { AlertType } from '@/types/database'

export interface AlertCheck {
  accountId: string
  accountName: string
  balance: number
  monthlyIncome: number
  monthlyExpenses: number
  lastMonthExpenses: number
  goals: Array<{ categoryId: string; categoryName: string; targetAmount: number; spent: number }>
  alertRules: Array<{ type: AlertType; threshold: number | null; accountId: string | null }>
}

export interface TriggeredAlert {
  type: AlertType
  accountId?: string
  accountName?: string
  message: string
  severity: 'warning' | 'critical'
}

export function runAlertsEngine(checks: AlertCheck[]): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = []

  for (const check of checks) {
    const { accountId, accountName, balance, monthlyIncome, monthlyExpenses, lastMonthExpenses, goals, alertRules } = check

    const relevantRules = alertRules.filter(r => r.accountId === null || r.accountId === accountId)

    for (const rule of relevantRules) {
      switch (rule.type) {
        case 'low_balance':
          if (rule.threshold !== null && balance < rule.threshold) {
            triggered.push({
              type: 'low_balance',
              accountId,
              accountName,
              message: `Saldo baixo em "${accountName}": ${formatCurrency(balance)}`,
              severity: balance <= 0 ? 'critical' : 'warning',
            })
          }
          break

        case 'expense_spike':
          if (lastMonthExpenses > 0 && monthlyExpenses > lastMonthExpenses * 1.3) {
            const pct = Math.round(((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
            triggered.push({
              type: 'expense_spike',
              accountId,
              accountName,
              message: `Gastos em "${accountName}" subiram ${pct}% vs. mês anterior`,
              severity: pct > 50 ? 'critical' : 'warning',
            })
          }
          break

        case 'net_negative':
          if (monthlyExpenses > monthlyIncome) {
            triggered.push({
              type: 'net_negative',
              accountId,
              accountName,
              message: `"${accountName}" está no negativo este mês`,
              severity: 'critical',
            })
          }
          break

        case 'over_goal':
          for (const goal of goals) {
            if (goal.spent > goal.targetAmount) {
              const pct = Math.round((goal.spent / goal.targetAmount) * 100)
              triggered.push({
                type: 'over_goal',
                accountId,
                accountName,
                message: `Meta de "${goal.categoryName}" ultrapassada: ${pct}% usado`,
                severity: pct > 120 ? 'critical' : 'warning',
              })
            }
          }
          break
      }
    }
  }

  return triggered
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}
