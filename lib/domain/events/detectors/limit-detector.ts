/**
 * lib/domain/events/detectors/limit-detector.ts
 *
 * Detects when a user's spending limit reaches a threshold.
 * Returns DetectedEvents — does NOT emit or write to DB.
 */
import { createClient } from '@supabase/supabase-js'

export interface DetectedEvent {
  userId: string
  type: 'limit_alert' | 'goal_milestone' | 'spending_spike'
  priority: 'push' | 'inbox_only'
  title: string
  message: string
  payload: Record<string, unknown>
  cooldownKey: string // unique key for cooldown check
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const THRESHOLDS = [80, 100]

export async function detectLimitAlerts(userId: string): Promise<DetectedEvent[]> {
  const supabase = getServiceClient()
  const events: DetectedEvent[] = []

  // Fetch all limits for user
  const { data: limits } = await supabase
    .from('limits')
    .select('id, name, amount, period')
    .eq('user_id', userId)

  if (!limits?.length) return events

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  for (const limit of limits) {
    // Sum spending in current period
    const { data: sumData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', monthStart)

    const spent = sumData?.reduce((acc, t) => acc + (t.amount || 0), 0) ?? 0
    const pct = Math.round((spent / limit.amount) * 100)

    for (const threshold of THRESHOLDS) {
      if (pct >= threshold && pct < threshold + 20) {
        const isOver = pct >= 100
        events.push({
          userId,
          type: 'limit_alert',
          priority: isOver ? 'push' : 'inbox_only',
          title: isOver
            ? `⚠️ Limite "${limit.name}" ultrapassado`
            : `⚡ Limite "${limit.name}" em ${pct}%`,
          message: isOver
            ? `Você gastou R$${spent.toFixed(2)} de R$${limit.amount.toFixed(2)} neste período.`
            : `Você já usou ${pct}% do seu limite de R$${limit.amount.toFixed(2)}.`,
          payload: { limitId: limit.id, limitName: limit.name, pct, spent, budget: limit.amount },
          cooldownKey: `limit_alert:${limit.id}:${threshold}`,
        })
      }
    }
  }

  return events
}
