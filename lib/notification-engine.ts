/**
 * Notification Engine
 *
 * Assembles structured summary payloads from metrics and insights.
 * Returns typed JSON objects consumed by the SummaryPopup component.
 * Messages are concise, executive, and neutral — no motivational phrases.
 */
import type { DailyMetrics, WeeklyMetrics, MonthlyMetrics, HealthStatus, GoalProgress, LimitStatus } from './metrics-engine'

// ─── Shared payload types ────────────────────────────────────────────────────

export interface SummaryItem {
  label: string
  value: string
  positive?: boolean // true = green, false = red, undefined = neutral
}

export interface DailySummaryPayload {
  type: 'daily'
  periodLabel: string
  items: SummaryItem[]
  topExpense: { name: string; amount: string } | null
  topAccount: { name: string } | null
  health: HealthStatus
  insights: string[]
  goals: Array<{ title: string; progress: number }>
  limitsNear: Array<{ name: string; pct: number }>
}

export interface WeeklySummaryPayload {
  type: 'weekly'
  periodLabel: string
  items: SummaryItem[]
  topCategory: { name: string; amount: string } | null
  topExpense: { name: string; amount: string } | null
  health: HealthStatus
  insights: string[]
  goals: Array<{ title: string; progress: number }>
  limitsExceeded: Array<{ name: string; pct: number }>
}

export interface MonthlySummaryPayload {
  type: 'monthly'
  periodLabel: string
  items: SummaryItem[]
  topAccount: { name: string } | null
  topExpense: { name: string; amount: string } | null
  health: HealthStatus
  insights: string[]
  goalsCompleted: number
  goalsTotal: number
  goals: Array<{ title: string; progress: number; current: string; target: string }>
  limitsExceeded: Array<{ name: string; pct: number }>
}

export type SummaryPayload = DailySummaryPayload | WeeklySummaryPayload | MonthlySummaryPayload

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(n)
}

function signedFmt(n: number): string {
  const abs = fmt(Math.abs(n))
  return n >= 0 ? `+${abs}` : `-${abs}`
}

function mapGoals(goals: GoalProgress[]): Array<{ title: string; progress: number }> {
  return goals
    .filter(g => g.progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)
    .map(g => ({ title: g.title, progress: g.progress }))
}

function mapLimits(limits: LimitStatus[]): Array<{ name: string; pct: number }> {
  return limits.map(l => ({ name: l.name, pct: l.pct }))
}

// ─── Daily Summary ────────────────────────────────────────────────────────────

export function buildDailySummaryPayload(m: DailyMetrics, insights: string[]): DailySummaryPayload {
  const periodLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(m.date + 'T12:00:00'))

  const items: SummaryItem[] = [
    { label: 'Entradas', value: fmt(m.totalIncome), positive: m.totalIncome > 0 },
    { label: 'Saídas', value: fmt(m.totalExpenses), positive: false },
    {
      label: 'Resultado',
      value: signedFmt(m.netResult),
      positive: m.netResult >= 0,
    },
  ]

  return {
    type: 'daily',
    periodLabel: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
    items,
    topExpense: m.topExpense ? { name: m.topExpense.name, amount: fmt(m.topExpense.amount) } : null,
    topAccount: m.topAccount ? { name: m.topAccount.name } : null,
    health: m.health,
    insights: insights.slice(0, 4),
    goals: mapGoals(m.goalsProgress),
    limitsNear: mapLimits(m.limitsNearThreshold),
  }
}

// ─── Weekly Summary ───────────────────────────────────────────────────────────

export function buildWeeklySummaryPayload(m: WeeklyMetrics, insights: string[]): WeeklySummaryPayload {
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
      new Date(d + 'T12:00:00'),
    )

  const periodLabel = `${fmtDate(m.weekStart)} — ${fmtDate(m.weekEnd)}`

  const items: SummaryItem[] = [
    { label: 'Entradas', value: fmt(m.totalIncome), positive: m.totalIncome > 0 },
    { label: 'Saídas', value: fmt(m.totalExpenses) },
    {
      label: 'Resultado',
      value: signedFmt(m.netResult),
      positive: m.netResult >= 0,
    },
  ]

  if (m.expenseGrowthPct !== null) {
    items.push({
      label: 'Variação de gastos',
      value: `${m.expenseGrowthPct > 0 ? '+' : ''}${m.expenseGrowthPct}%`,
      positive: m.expenseGrowthPct <= 0,
    })
  }

  return {
    type: 'weekly',
    periodLabel,
    items,
    topCategory: m.topCategory ? { name: m.topCategory.name, amount: fmt(m.topCategory.amount) } : null,
    topExpense: m.topExpense ? { name: m.topExpense.name, amount: fmt(m.topExpense.amount) } : null,
    health: m.health,
    insights: insights.slice(0, 5),
    goals: mapGoals(m.goalsProgress),
    limitsExceeded: mapLimits(m.limitsExceeded),
  }
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export function buildMonthlySummaryPayload(m: MonthlyMetrics, insights: string[]): MonthlySummaryPayload {
  const items: SummaryItem[] = [
    { label: 'Entradas totais', value: fmt(m.totalIncome), positive: m.totalIncome > 0 },
    { label: 'Saídas totais', value: fmt(m.totalExpenses) },
    {
      label: 'Lucro líquido',
      value: signedFmt(m.netResult),
      positive: m.netResult >= 0,
    },
    {
      label: 'Patrimônio total',
      value: fmt(m.totalPatrimony),
      positive: m.totalPatrimony > 0,
    },
  ]

  if (m.expenseGrowthPct !== null) {
    items.push({
      label: 'Variação de gastos',
      value: `${m.expenseGrowthPct > 0 ? '+' : ''}${m.expenseGrowthPct}%`,
      positive: m.expenseGrowthPct <= 0,
    })
  }

  if (m.savedVsPreviousMonth !== 0) {
    items.push({
      label: m.savedVsPreviousMonth > 0 ? 'Economia vs mês anterior' : 'Diferença vs mês anterior',
      value: signedFmt(m.savedVsPreviousMonth),
      positive: m.savedVsPreviousMonth > 0,
    })
  }

  const goalsWithFull = m.goalsProgress
    .filter(g => g.progress >= 20)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)
    .map(g => ({
      title: g.title,
      progress: g.progress,
      current: fmt(g.current),
      target: fmt(g.target),
    }))

  return {
    type: 'monthly',
    periodLabel: m.monthLabel,
    items,
    topAccount: m.topAccount ? { name: m.topAccount.name } : null,
    topExpense: m.topExpense ? { name: m.topExpense.name, amount: fmt(m.topExpense.amount) } : null,
    health: m.health,
    insights: insights.slice(0, 6),
    goalsCompleted: m.goalsCompleted,
    goalsTotal: m.goalsProgress.length + m.goalsCompleted,
    goals: goalsWithFull,
    limitsExceeded: mapLimits(m.limitsExceeded),
  }
}
