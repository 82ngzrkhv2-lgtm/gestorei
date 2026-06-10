'use client'

/**
 * NotificationContentRenderer
 *
 * Routes a notification to its specific modal component by type.
 * Each modal is independent — no coupling between them.
 */
import type { Notification } from '@/lib/hooks/use-notifications'
import dynamic from 'next/dynamic'

const SummaryModal       = dynamic(() => import('./modals/SummaryModal'))
const LimitAlertModal    = dynamic(() => import('./modals/LimitAlertModal'))
const GoalMilestoneModal = dynamic(() => import('./modals/GoalMilestoneModal'))
const SpendingAlertModal = dynamic(() => import('./modals/SpendingAlertModal'))

interface Props {
  notification: Notification
  onClose: () => void
}

export default function NotificationContentRenderer({ notification, onClose }: Props) {
  switch (notification.type) {
    case 'daily_ready':
    case 'weekly_ready':
    case 'monthly_ready':
      return <SummaryModal notification={notification} onClose={onClose} />

    case 'limit_alert':
      return <LimitAlertModal notification={notification} onClose={onClose} />

    case 'goal_milestone':
      return <GoalMilestoneModal notification={notification} onClose={onClose} />

    case 'spending_spike':
      return <SpendingAlertModal notification={notification} onClose={onClose} />

    default:
      return null
  }
}
