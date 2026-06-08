/**
 * Insight Engine
 *
 * Generates conditional insights from financial metrics.
 * Rule-based only — no AI. Clear, executive, neutral tone.
 */
import type { DailyMetrics, WeeklyMetrics, MonthlyMetrics } from './metrics-engine'

function fmt(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(n)
}

// ─── Daily Insights ─────────────────────────────────────────────────────────────

export function generateDailyInsights(m: DailyMetrics): string[] {
  const insights: string[] = []

  // Net result
  if (m.netResult > 0) {
    insights.push(`✅ Resultado positivo hoje: ${fmt(m.netResult)}`)
  } else if (m.netResult < 0) {
    insights.push(`⚠️ Resultado negativo hoje: ${fmt(Math.abs(m.netResult))}`)
  } else if (m.totalIncome === 0 && m.totalExpenses === 0) {
    insights.push(`📭 Nenhuma movimentação registrada hoje.`)
  }

  // Limits near threshold
  for (const l of m.limitsNearThreshold) {
    if (l.pct >= 100) {
      insights.push(`🔴 Limite de "${l.name}" ultrapassado: ${l.pct}% usado.`)
    } else {
      insights.push(`⚠️ Você utilizou ${l.pct}% do limite de "${l.name}".`)
    }
  }

  // Goals close to completion
  for (const g of m.goalsProgress) {
    if (g.progress >= 100) {
      insights.push(`🏆 Meta "${g.title}" concluída!`)
    } else if (g.progress >= 80) {
      insights.push(`🎯 Meta "${g.title}" está em ${g.progress}% — quase lá.`)
    }
  }

  return insights
}

// ─── Weekly Insights ────────────────────────────────────────────────────────────

export function generateWeeklyInsights(m: WeeklyMetrics): string[] {
  const insights: string[] = []

  // Expense trend
  if (m.expenseGrowthPct !== null) {
    if (m.expenseGrowthPct > 0) {
      insights.push(`📉 Gastos aumentaram ${m.expenseGrowthPct}% em relação à semana passada.`)
    } else if (m.expenseGrowthPct < 0) {
      insights.push(`📈 Gastos reduziram ${Math.abs(m.expenseGrowthPct)}% em relação à semana passada.`)
    }
  }

  // Savings vs previous week
  if (m.savedVsPreviousWeek > 0) {
    insights.push(`✅ Você economizou ${fmt(m.savedVsPreviousWeek)} em relação à semana passada.`)
  } else if (m.savedVsPreviousWeek < 0) {
    insights.push(`⚠️ Você gastou ${fmt(Math.abs(m.savedVsPreviousWeek))} a mais do que na semana passada.`)
  }

  // Net result
  if (m.netResult < 0) {
    insights.push(`🔴 Resultado semanal negativo: ${fmt(Math.abs(m.netResult))} no vermelho.`)
  } else if (m.netResult > 0) {
    insights.push(`🟢 Semana positiva: sobrou ${fmt(m.netResult)}.`)
  }

  // Limits exceeded
  for (const l of m.limitsExceeded) {
    insights.push(`🔴 Limite de "${l.name}" ultrapassado: ${l.pct}% utilizado.`)
  }

  // Goals
  for (const g of m.goalsProgress) {
    if (g.progress >= 100) {
      insights.push(`🏆 Meta "${g.title}" concluída!`)
    } else if (g.progress >= 70) {
      insights.push(`🎯 Meta mais próxima: "${g.title}" — ${g.progress}%`)
    }
  }

  return insights
}

// ─── Monthly Insights ───────────────────────────────────────────────────────────

export function generateMonthlyInsights(m: MonthlyMetrics): string[] {
  const insights: string[] = []

  // Expense trend
  if (m.expenseGrowthPct !== null) {
    if (m.expenseGrowthPct > 0) {
      insights.push(`📉 Seus gastos aumentaram ${m.expenseGrowthPct}% este mês.`)
    } else if (m.expenseGrowthPct < 0) {
      insights.push(`📈 Seus gastos reduziram ${Math.abs(m.expenseGrowthPct)}% em relação ao mês passado.`)
    }
  }

  // Savings vs previous month
  if (m.savedVsPreviousMonth > 0) {
    insights.push(`✅ Você economizou ${fmt(m.savedVsPreviousMonth)} em relação ao mês passado.`)
  } else if (m.savedVsPreviousMonth < 0) {
    insights.push(`⚠️ Resultado ${fmt(Math.abs(m.savedVsPreviousMonth))} abaixo do mês anterior.`)
  }

  // Net result
  if (m.netResult < 0) {
    insights.push(`🔴 Mês fechou no vermelho: ${fmt(Math.abs(m.netResult))}.`)
  }

  // Limits exceeded
  for (const l of m.limitsExceeded) {
    insights.push(`🔴 Limite de "${l.name}" ultrapassado: ${l.pct}% utilizado.`)
  }

  // Goals completed
  if (m.goalsCompleted > 0) {
    insights.push(`🏆 ${m.goalsCompleted} meta${m.goalsCompleted > 1 ? 's' : ''} concluída${m.goalsCompleted > 1 ? 's' : ''} este mês.`)
  }

  // Reserve/goal evolution
  for (const g of m.goalsProgress) {
    if (g.progress >= 100) {
      insights.push(`✅ Meta "${g.title}" concluída — ${fmt(g.current)} de ${fmt(g.target)}.`)
    } else if (g.progress >= 50) {
      insights.push(`🎯 Meta "${g.title}": ${g.progress}% — ${fmt(g.current)} de ${fmt(g.target)}.`)
    }
  }

  return insights
}
