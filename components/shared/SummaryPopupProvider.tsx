'use client'

/**
 * SummaryPopupProvider
 *
 * Client-side wrapper that sits inside the server AppLayout.
 * Uses the useUnreadSummary hook to detect pending summaries
 * and renders the SummaryPopup when one is found.
 */
import dynamic from 'next/dynamic'
import { useUnreadSummary } from '@/lib/hooks/use-unread-summary'

// Lazy-load the heavy popup component
const SummaryPopup = dynamic(() => import('@/components/shared/SummaryPopup'), { ssr: false })

export default function SummaryPopupProvider() {
  const { summary, dismiss } = useUnreadSummary()

  if (!summary) return null

  return (
    <SummaryPopup
      summaryId={summary.id}
      type={summary.type}
      periodLabel={summary.periodLabel}
      payload={summary.content}
      onDismiss={dismiss}
    />
  )
}
