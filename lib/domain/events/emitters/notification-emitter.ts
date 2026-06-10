/**
 * lib/domain/events/emitters/notification-emitter.ts
 *
 * Receives DetectedEvents, applies cooldown checks, and writes
 * approved events to the `notifications` table.
 *
 * Cooldowns:
 *   limit_alert      → 24h per limit+threshold key
 *   goal_milestone   → permanent per limit (once per milestone marker)
 *   spending_spike   → 48h
 */
import { createClient } from '@supabase/supabase-js'
import type { DetectedEvent } from '../detectors/limit-detector'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const COOLDOWN_HOURS: Record<string, number> = {
  limit_alert:     24,
  goal_milestone:  8760, // 1 year — effectively permanent per milestone
  spending_spike:  48,
}

export interface EmittedNotification extends DetectedEvent {
  id: string
}

export async function emitNotifications(
  events: DetectedEvent[]
): Promise<EmittedNotification[]> {
  if (!events.length) return []

  const supabase = getServiceClient()
  const emitted: EmittedNotification[] = []

  for (const event of events) {
    const cooldownHours = COOLDOWN_HOURS[event.type] ?? 24

    // Check cooldown
    const { data: cooldown } = await supabase
      .from('notification_cooldowns')
      .select('last_fired_at')
      .eq('user_id', event.userId)
      .eq('event_type', event.cooldownKey)
      .single()

    if (cooldown) {
      const lastFired = new Date(cooldown.last_fired_at).getTime()
      const hoursSince = (Date.now() - lastFired) / (1000 * 60 * 60)
      if (hoursSince < cooldownHours) continue // Still in cooldown
    }

    // Insert notification
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        user_id:  event.userId,
        type:     event.type,
        title:    event.title,
        message:  event.message,
        payload:  event.payload,
        priority: event.priority,
        read:     false,
      })
      .select('id')
      .single()

    if (error || !inserted) continue

    // Upsert cooldown
    await supabase.from('notification_cooldowns').upsert(
      { user_id: event.userId, event_type: event.cooldownKey, last_fired_at: new Date().toISOString() },
      { onConflict: 'user_id,event_type' }
    )

    emitted.push({ ...event, id: inserted.id })
  }

  return emitted
}
