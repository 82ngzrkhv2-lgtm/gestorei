'use client'

/**
 * useUnreadSummary
 *
 * Fetches the most recent unread summary once on mount.
 * Exposes `dismiss()` to mark it as read and clear it from state.
 */
import { useState, useEffect, useCallback } from 'react'
import type { SummaryPayload } from '@/lib/notification-engine'

export interface UnreadSummary {
  id: string
  type: 'daily' | 'weekly' | 'monthly'
  periodLabel: string
  content: SummaryPayload
  generatedAt: string
}

export function useUnreadSummary() {
  const [summary, setSummary] = useState<UnreadSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch('/api/summaries/unread')
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.summary) {
          setSummary(data.summary as UnreadSummary)
        }
      })
      .catch(() => {
        // Silently fail — pop-up is non-critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const dismiss = useCallback(async () => {
    if (!summary) return
    const id = summary.id
    setSummary(null) // Optimistic — clear immediately for instant UX

    try {
      await fetch(`/api/summaries/${id}/dismiss`, { method: 'PATCH' })
    } catch {
      // Non-critical — even if the request fails the user won't see the popup again
      // in this session (state was cleared). It'll reappear next session if it was
      // still unread, which is acceptable.
    }
  }, [summary])

  return { summary, loading, dismiss }
}
