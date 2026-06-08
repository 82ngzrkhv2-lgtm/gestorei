/**
 * Notification Engine
 *
 * Assembles formatted WhatsApp-ready text messages from metrics and insights.
 * Messages are concise, executive, and neutral — no motivational phrases.
 */
import type { DailyMetrics, WeeklyMetrics, MonthlyMetrics } from './metrics-engine'

function fmt(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(n)
}

function sign(n: number): string {
  return n >= 0 ? '+' : '-'
}

// ─── Daily Summary ──────────────────────────────────────────────────────────────

export function buildDailySummaryMessage(m: DailyMetrics, insights: string[]): string {
  const dateParts = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(m.date + 'T12:00:00'))

  const lines: string[] = [
    `📊 *Resumo Financeiro — ${dateParts.charAt(0).toUpperCase() + dateParts.slice(1)}*`,
    ``,
    `Entradas: *${fmt(m.totalIncome)}*`,
    `Saídas: *${fmt(m.totalExpenses)}*`,
    `Resultado: *${sign(m.netResult)}${fmt(Math.abs(m.netResult))}*`,
  ]

  if (m.topExpense) {
    lines.push(``)
    lines.push(`💸 Maior gasto: *${m.topExpense.name}* — ${fmt(m.topExpense.amount)}`)
  }

  if (m.topAccount) {
    lines.push(`🏦 Núcleo mais movimentado: *${m.topAccount.name}*`)
  }

  // Health
  lines.push(``)
  lines.push(`${m.health.emoji} Saúde financeira: *${m.health.label}*`)

  // Insights (max 3)
  if (insights.length > 0) {
    lines.push(``)
    for (const insight of insights.slice(0, 3)) {
      lines.push(insight)
    }
  }

  // Goals summary (max 2)
  const nearGoals = m.goalsProgress.filter(g => g.progress >= 50).slice(0, 2)
  if (nearGoals.length > 0) {
    lines.push(``)
    for (const g of nearGoals) {
      lines.push(`🎯 ${g.title}: ${g.progress}%`)
    }
  }

  return lines.join('\n')
}

// ─── Weekly Summary ─────────────────────────────────────────────────────────────

export function buildWeeklySummaryMessage(m: WeeklyMetrics, insights: string[]): string {
  const fmtDate = (d: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(d + 'T12:00:00'))

  const lines: string[] = [
    `📈 *Resumo Semanal — ${fmtDate(m.weekStart)} a ${fmtDate(m.weekEnd)}*`,
    ``,
    `Entradas: *${fmt(m.totalIncome)}*`,
    `Saídas: *${fmt(m.totalExpenses)}*`,
    `Resultado: *${sign(m.netResult)}${fmt(Math.abs(m.netResult))}*`,
  ]

  if (m.topCategory) {
    lines.push(``)
    lines.push(`💸 Maior gasto: *${m.topCategory.name}* — ${fmt(m.topCategory.amount)}`)
  }

  if (m.topExpense) {
    lines.push(`📋 Maior transação: *${m.topExpense.name}* — ${fmt(m.topExpense.amount)}`)
  }

  // Health
  lines.push(``)
  lines.push(`${m.health.emoji} Saúde financeira: *${m.health.label}*`)

  // Insights (max 4)
  if (insights.length > 0) {
    lines.push(``)
    for (const insight of insights.slice(0, 4)) {
      lines.push(insight)
    }
  }

  // Top goals in progress
  const topGoals = m.goalsProgress
    .filter(g => g.progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2)

  if (topGoals.length > 0) {
    lines.push(``)
    for (const g of topGoals) {
      lines.push(`🎯 ${g.title}: ${g.progress}%`)
    }
  }

  return lines.join('\n')
}

// ─── Monthly Summary ────────────────────────────────────────────────────────────

export function buildMonthlySummaryMessage(m: MonthlyMetrics, insights: string[]): string {
  const lines: string[] = [
    `📊 *Fechamento Financeiro — ${m.monthLabel}*`,
    ``,
    `Entradas: *${fmt(m.totalIncome)}*`,
    `Saídas: *${fmt(m.totalExpenses)}*`,
    `Lucro líquido: *${sign(m.netResult)}${fmt(Math.abs(m.netResult))}*`,
    `Patrimônio total: *${fmt(m.totalPatrimony)}*`,
  ]

  if (m.topAccount) {
    lines.push(``)
    lines.push(`🏆 Melhor núcleo: *${m.topAccount.name}*`)
  }

  if (m.topExpense) {
    lines.push(`💸 Maior gasto: *${m.topExpense.name}* — ${fmt(m.topExpense.amount)}`)
  }

  // Health
  lines.push(``)
  lines.push(`${m.health.emoji} Saúde financeira: *${m.health.label}*`)

  // Insights (max 5)
  if (insights.length > 0) {
    lines.push(``)
    for (const insight of insights.slice(0, 5)) {
      lines.push(insight)
    }
  }

  // Goals summary
  const activeLimits = m.limitsExceeded
  if (activeLimits.length > 0 || m.goalsCompleted > 0) {
    lines.push(``)
    if (m.goalsCompleted > 0) {
      lines.push(`🎯 Metas concluídas: *${m.goalsCompleted}/${m.goalsProgress.length + m.goalsCompleted}*`)
    }
    if (activeLimits.length > 0) {
      lines.push(`⚠️ Limites ultrapassados: *${activeLimits.length}*`)
    }
  }

  // Top in-progress goals
  const topGoals = m.goalsProgress
    .filter(g => g.progress < 100 && g.progress >= 30)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2)

  if (topGoals.length > 0) {
    lines.push(``)
    for (const g of topGoals) {
      lines.push(`📍 ${g.title}: ${g.progress}% — ${fmt(g.current)}`)
    }
  }

  return lines.join('\n')
}
