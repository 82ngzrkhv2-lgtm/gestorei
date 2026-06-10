/**
 * lib/domain/events/processors/delivery-processor.ts
 *
 * Decides how to deliver each emitted notification.
 * push priority  → also sends a PWA push (if enabled via feature flag)
 * inbox_only     → already in DB, nothing extra needed
 */
import type { EmittedNotification } from '../emitters/notification-emitter'
import { sendPushToUser } from '@/lib/push-service'

export async function processDelivery(
  notifications: EmittedNotification[]
): Promise<void> {
  for (const notif of notifications) {
    if (notif.priority === 'push') {
      // push-service handles the PUSH_NOTIFICATIONS_ENABLED flag internally
      await sendPushToUser(notif.userId, {
        title: notif.title,
        body:  notif.message,
        data:  { notificationId: notif.id, type: notif.type },
      })
    }
    // inbox_only: already inserted into DB by emitter — nothing to do
  }
}
