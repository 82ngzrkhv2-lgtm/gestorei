/**
 * lib/push-service.ts
 *
 * PWA Web Push delivery service.
 * Feature-flagged via PUSH_NOTIFICATIONS_ENABLED env var.
 *
 * To generate VAPID keys (run once):
 *   npx web-push generate-vapid-keys
 * Then add to .env.local:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_CONTACT=mailto:suporte@gestorei.com.br
 */
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function isEnabled(): boolean {
  return process.env.PUSH_NOTIFICATIONS_ENABLED === 'true'
}

function initWebPush() {
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const contact    = process.env.VAPID_CONTACT ?? 'mailto:suporte@gestorei.com.br'

  if (!publicKey || !privateKey) {
    console.warn('[push-service] VAPID keys not configured. Push notifications disabled.')
    return false
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)
  return true
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Sends a push notification to ALL registered devices of a user.
 * Silently skips if feature flag is off or keys are not configured.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isEnabled()) return
  if (!initWebPush()) return

  const supabase = getServiceClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription_json')
    .eq('user_id', userId)

  if (!subs?.length) return

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data:  payload.data ?? {},
  })

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub.subscription_json as webpush.PushSubscription,
        notificationPayload
      )

      // Update last_used_at
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)

    } catch (err: unknown) {
      // Remove invalid/expired subscriptions (410 Gone)
      const webPushError = err as { statusCode?: number }
      if (webPushError?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('[push-service] Push failed for sub', sub.id, err)
      }
    }
  }
}
