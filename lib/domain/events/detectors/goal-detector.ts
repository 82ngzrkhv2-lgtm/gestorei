/**
 * lib/domain/events/detectors/goal-detector.ts
 *
 * Detects when a user's goal crosses a milestone (25, 50, 75, 100%).
 * Returns DetectedEvents — does NOT emit or write to DB.
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

const MILESTONES = [25, 50, 75, 100]

export async function detectGoalMilestones(userId: string): Promise<DetectedEvent[]> {
  const supabase = getServiceClient()
  const events: DetectedEvent[] = []

  const { data: goals } = await supabase
    .from('goals')
    .select('id, title, target_amount, current_amount')
    .eq('user_id', userId)

  if (!goals?.length) return events

  for (const goal of goals) {
    const pct = Math.round(((goal.current_amount ?? 0) / goal.target_amount) * 100)
    
    for (const milestone of MILESTONES) {
      // Only fire if we're within 5% above the milestone (just crossed it)
      if (pct >= milestone && pct < milestone + 5) {
        const isComplete = milestone === 100
        events.push({
          userId,
          type: 'goal_milestone',
          priority: isComplete ? 'push' : 'inbox_only',
          title: isComplete
            ? `🎯 Meta "${goal.title}" concluída!`
            : `🎯 Meta "${goal.title}" chegou a ${milestone}%`,
          message: isComplete
            ? `Parabéns! Você atingiu R$${goal.target_amount.toFixed(2)} na sua meta.`
            : `Você está em R$${(goal.current_amount ?? 0).toFixed(2)} de R$${goal.target_amount.toFixed(2)}.`,
          payload: {
            goalId: goal.id,
            goalTitle: goal.title,
            milestone,
            pct,
            current: goal.current_amount,
            target: goal.target_amount,
          },
          cooldownKey: `goal_milestone:${goal.id}:${milestone}`,
        })
      }
    }
  }

  return events
}
