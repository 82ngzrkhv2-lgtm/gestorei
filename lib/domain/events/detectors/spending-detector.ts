/**
 * lib/domain/events/detectors/spending-detector.ts
 *
 * Detects spending spikes: today's spending vs. 7-day daily average.
 * Fires if current day's spending is >= 40% above average.
 */
import { createClient } from '@supabase/supabase-js'
import type { DetectedEvent } from './limit-detector'

export { DetectedEvent }

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function detectSpendingSpike(userId: string): Promise<DetectedEvent[]> {
  const supabase = getServiceClient()
  const events: DetectedEvent[] = []

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  // Today's spending
  const { data: todayData } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('date', todayStr)

  const todaySpending = todayData?.reduce((a, t) => a + (t.amount || 0), 0) ?? 0
  if (todaySpending === 0) return events

  // Last 7 days spending (excluding today)
  const { data: histData } = await supabase
    .from('transactions')
    .select('amount, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', sevenDaysAgo)
    .lt('date', todayStr)

  if (!histData?.length) return events

  // Group by day and compute daily average
  const byDay = histData.reduce<Record<string, number>>((acc, t) => {
    acc[t.date] = (acc[t.date] ?? 0) + (t.amount || 0)
    return acc
  }, {})
  const dailyAvg = Object.values(byDay).reduce((a, v) => a + v, 0) / Object.keys(byDay).length

  if (dailyAvg === 0) return events

  const pctAbove = Math.round(((todaySpending - dailyAvg) / dailyAvg) * 100)

  if (pctAbove >= 40) {
    events.push({
      userId,
      type: 'spending_spike',
      priority: pctAbove >= 100 ? 'push' : 'inbox_only',
      title: `📈 Gasto acima do normal hoje`,
      message: `Você gastou R$${todaySpending.toFixed(2)} hoje — ${pctAbove}% acima da sua média diária de R$${dailyAvg.toFixed(2)}.`,
      payload: { todaySpending, dailyAvg, pctAbove },
      cooldownKey: `spending_spike:${userId}:${todayStr}`,
    })
  }

  return events
}
