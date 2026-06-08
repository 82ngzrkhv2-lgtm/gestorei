/**
 * Metrics Engine
 *
 * Responsible for computing financial indicators per period.
 * No AI — pure data aggregation and arithmetic.
 */
import { createClient } from '@/lib/supabase/server'

// ─── Shared helpers ────────────────────────────────────────────────────────────

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(d: Date): string {
  return formatDateStr(d)
}

function endOfDay(d: Date): string {
  return formatDateStr(d)
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TopItem {
  name: string
  amount: number
}

export interface GoalProgress {
  title: string
  target: number
  current: number
  progress: number // 0-100
}

export interface LimitStatus {
  name: string
  used: number
  limit: number
  pct: number // 0-100+
}

export interface HealthStatus {
  label: string
  color: 'green' | 'yellow' | 'red'
  emoji: '🟢' | '🟡' | '🔴'
}

export interface DailyMetrics {
  date: string
  totalIncome: number
  totalExpenses: number
  netResult: number
  topExpense: TopItem | null
  topAccount: TopItem | null
  goalsProgress: GoalProgress[]
  limitsNearThreshold: LimitStatus[]
  health: HealthStatus
}

export interface WeeklyMetrics {
  weekStart: string
  weekEnd: string
  totalIncome: number
  totalExpenses: number
  netResult: number
  topCategory: TopItem | null
  topExpense: TopItem | null
  previousWeekExpenses: number
  expenseGrowthPct: number | null  // null if no prior data
  savedVsPreviousWeek: number      // negative = spent more
  goalsProgress: GoalProgress[]
  limitsExceeded: LimitStatus[]
  health: HealthStatus
}

export interface MonthlyMetrics {
  monthLabel: string
  monthStart: string
  monthEnd: string
  totalIncome: number
  totalExpenses: number
  netResult: number
  totalPatrimony: number
  previousMonthExpenses: number
  previousMonthIncome: number
  expenseGrowthPct: number | null
  savedVsPreviousMonth: number
  topAccount: TopItem | null        // nucleus with most profit
  topExpense: TopItem | null        // biggest single expense category
  topExpenseAccount: TopItem | null // biggest spending account
  goalsProgress: GoalProgress[]
  goalsCompleted: number
  limitsExceeded: LimitStatus[]
  health: HealthStatus
}

// ─── Financial Health ───────────────────────────────────────────────────────────

function computeHealth(netResult: number, expenseGrowthPct: number | null): HealthStatus {
  if (netResult < 0 || (expenseGrowthPct !== null && expenseGrowthPct > 30)) {
    return { label: 'Atenção necessária', color: 'red', emoji: '🔴' }
  }
  if (netResult < 500 || (expenseGrowthPct !== null && expenseGrowthPct > 10)) {
    return { label: 'Moderado', color: 'yellow', emoji: '🟡' }
  }
  return { label: 'Saudável', color: 'green', emoji: '🟢' }
}

// ─── Raw transaction shape (normalized from Supabase join) ────────────────────

interface RawTransaction {
  type: string
  amount: number
  description?: string | null
  accounts?: { name: string } | null
  categories?: { name: string } | null
}

// ─── Shared data fetchers ───────────────────────────────────────────────────────

async function fetchTransactions(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, start: string, end: string): Promise<RawTransaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select('id, type, amount, description, date, account_id, category_id, accounts(name), categories(name)')
    .eq('user_id', userId)
    .neq('type', 'transfer')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  // Supabase returns related rows as arrays for to-many joins; normalize to singular objects
  return (data ?? []).map(row => ({
    type: row.type as string,
    amount: row.amount as number,
    description: row.description as string | null | undefined,
    accounts: Array.isArray(row.accounts)
      ? (row.accounts[0] as { name: string } | undefined) ?? null
      : (row.accounts as { name: string } | null),
    categories: Array.isArray(row.categories)
      ? (row.categories[0] as { name: string } | undefined) ?? null
      : (row.categories as { name: string } | null),
  }))
}


async function fetchGoalsProgress(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<GoalProgress[]> {
  const { data } = await supabase
    .from('financial_goals')
    .select('title, target_amount, current_amount, status')
    .eq('user_id', userId)
    .eq('status', 'in_progress')

  return (data ?? []).map(g => ({
    title: g.title,
    target: g.target_amount,
    current: g.current_amount,
    progress: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
  }))
}

async function fetchLimits(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, threshold = 75): Promise<LimitStatus[]> {
  const { data } = await supabase
    .from('financial_limits')
    .select('monthly_limit, current_usage, alert_threshold, accounts(name), categories(name)')
    .eq('user_id', userId)

  return (data ?? [])
    .map(l => {
      const acc = (Array.isArray(l.accounts) ? l.accounts[0] : l.accounts) as { name: string } | null | undefined
      const cat = (Array.isArray(l.categories) ? l.categories[0] : l.categories) as { name: string } | null | undefined
      const name = acc?.name ?? cat?.name ?? 'Limite'
      const pct = l.monthly_limit > 0 ? Math.round((l.current_usage / l.monthly_limit) * 100) : 0
      return { name, used: l.current_usage, limit: l.monthly_limit, pct }
    })
    .filter(l => l.pct >= threshold)
}

async function fetchTotalPatrimony(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  const { data } = await supabase
    .from('accounts')
    .select('balance')
    .eq('user_id', userId)
    .eq('is_active', true)

  return (data ?? []).reduce((sum, a) => sum + (a.balance ?? 0), 0)
}

// ─── Aggregation helpers ────────────────────────────────────────────────────────

function sumBy(txs: RawTransaction[], type: 'income' | 'expense'): number {
  return txs.filter(t => t.type === type).reduce((s, t) => s + (t.amount ?? 0), 0)
}

function topExpenseByAmount(txs: RawTransaction[]): TopItem | null {
  const expenses = txs.filter(t => t.type === 'expense')
  if (!expenses.length) return null
  const top = expenses.reduce((a, b) => (b.amount > a.amount ? b : a))
  return {
    name: top.description ?? top.categories?.name ?? 'Gasto',
    amount: top.amount,
  }
}

function topAccountByVolume(txs: RawTransaction[]): TopItem | null {
  const map = new Map<string, number>()
  for (const t of txs) {
    const name = t.accounts?.name ?? 'Sem conta'
    map.set(name, (map.get(name) ?? 0) + t.amount)
  }
  if (!map.size) return null
  const [name, amount] = [...map.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name, amount }
}

function topCategoryByExpense(txs: RawTransaction[]): TopItem | null {
  const map = new Map<string, number>()
  for (const t of txs.filter(t => t.type === 'expense')) {
    const name = t.categories?.name ?? 'Sem categoria'
    map.set(name, (map.get(name) ?? 0) + t.amount)
  }
  if (!map.size) return null
  const [name, amount] = [...map.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name, amount }
}

function topAccountByIncome(txs: RawTransaction[]): TopItem | null {
  const map = new Map<string, number>()
  for (const t of txs.filter(t => t.type === 'income')) {
    const name = t.accounts?.name ?? 'Sem conta'
    map.set(name, (map.get(name) ?? 0) + t.amount)
  }
  if (!map.size) return null
  const [name, amount] = [...map.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name, amount }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export async function computeDailyMetrics(userId: string, date: Date = new Date()): Promise<DailyMetrics> {
  const supabase = await createClient()
  const dateStr = startOfDay(date)

  const txs = await fetchTransactions(supabase, userId, dateStr, endOfDay(date))
  const goals = await fetchGoalsProgress(supabase, userId)
  const limits = await fetchLimits(supabase, userId, 75)

  const totalIncome = sumBy(txs, 'income')
  const totalExpenses = sumBy(txs, 'expense')
  const netResult = totalIncome - totalExpenses

  return {
    date: dateStr,
    totalIncome,
    totalExpenses,
    netResult,
    topExpense: topExpenseByAmount(txs),
    topAccount: topAccountByVolume(txs),
    goalsProgress: goals,
    limitsNearThreshold: limits,
    health: computeHealth(netResult, null),
  }
}

export async function computeWeeklyMetrics(userId: string, weekStart: Date, weekEnd: Date): Promise<WeeklyMetrics> {
  const supabase = await createClient()

  const prevWeekEnd = new Date(weekStart)
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
  const prevWeekStart = new Date(prevWeekEnd)
  prevWeekStart.setDate(prevWeekStart.getDate() - 6)

  const [txs, prevTxs, goals, limits] = await Promise.all([
    fetchTransactions(supabase, userId, formatDateStr(weekStart), formatDateStr(weekEnd)),
    fetchTransactions(supabase, userId, formatDateStr(prevWeekStart), formatDateStr(prevWeekEnd)),
    fetchGoalsProgress(supabase, userId),
    fetchLimits(supabase, userId, 100),
  ])

  const totalIncome = sumBy(txs, 'income')
  const totalExpenses = sumBy(txs, 'expense')
  const netResult = totalIncome - totalExpenses

  const previousWeekExpenses = sumBy(prevTxs, 'expense')
  const expenseGrowthPct = previousWeekExpenses > 0
    ? Math.round(((totalExpenses - previousWeekExpenses) / previousWeekExpenses) * 100)
    : null

  const previousWeekIncome = sumBy(prevTxs, 'income')
  const savedVsPreviousWeek = (previousWeekIncome - previousWeekExpenses) - (totalIncome - totalExpenses)

  return {
    weekStart: formatDateStr(weekStart),
    weekEnd: formatDateStr(weekEnd),
    totalIncome,
    totalExpenses,
    netResult,
    topCategory: topCategoryByExpense(txs),
    topExpense: topExpenseByAmount(txs),
    previousWeekExpenses,
    expenseGrowthPct,
    savedVsPreviousWeek: -savedVsPreviousWeek, // positive = saved more this week vs last
    goalsProgress: goals,
    limitsExceeded: limits,
    health: computeHealth(netResult, expenseGrowthPct),
  }
}

export async function computeMonthlyMetrics(userId: string, monthStart: Date, monthEnd: Date): Promise<MonthlyMetrics> {
  const supabase = await createClient()

  const prevMonthEnd = new Date(monthStart)
  prevMonthEnd.setDate(prevMonthEnd.getDate() - 1)
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)

  const [txs, prevTxs, goals, limits, patrimony] = await Promise.all([
    fetchTransactions(supabase, userId, formatDateStr(monthStart), formatDateStr(monthEnd)),
    fetchTransactions(supabase, userId, formatDateStr(prevMonthStart), formatDateStr(prevMonthEnd)),
    fetchGoalsProgress(supabase, userId),
    fetchLimits(supabase, userId, 100),
    fetchTotalPatrimony(supabase, userId),
  ])

  const totalIncome = sumBy(txs, 'income')
  const totalExpenses = sumBy(txs, 'expense')
  const netResult = totalIncome - totalExpenses

  const previousMonthExpenses = sumBy(prevTxs, 'expense')
  const previousMonthIncome = sumBy(prevTxs, 'income')
  const expenseGrowthPct = previousMonthExpenses > 0
    ? Math.round(((totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 100)
    : null

  const prevNetResult = previousMonthIncome - previousMonthExpenses
  const savedVsPreviousMonth = netResult - prevNetResult

  const goalsCompleted = goals.filter(g => g.progress >= 100).length

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(monthStart)

  return {
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    monthStart: formatDateStr(monthStart),
    monthEnd: formatDateStr(monthEnd),
    totalIncome,
    totalExpenses,
    netResult,
    totalPatrimony: patrimony,
    previousMonthExpenses,
    previousMonthIncome,
    expenseGrowthPct,
    savedVsPreviousMonth,
    topAccount: topAccountByIncome(txs),
    topExpenseAccount: topAccountByVolume(txs.filter(t => t.type === 'expense')),
    topExpense: topCategoryByExpense(txs),
    goalsProgress: goals,
    goalsCompleted,
    limitsExceeded: limits,
    health: computeHealth(netResult, expenseGrowthPct),
  }
}
