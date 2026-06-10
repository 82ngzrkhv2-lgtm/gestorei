'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/hooks/use-notifications'
import SummaryPopup from '@/components/shared/SummaryPopup'
import type { SummaryPayload } from '@/lib/notification-engine'

interface Props { notification: Notification; onClose: () => void }

export default function SummaryModal({ notification, onClose }: Props) {
  const supabase = createClient()
  const [payload, setPayload] = useState<SummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const summaryType = (notification.payload?.summaryType ?? 'daily') as 'daily' | 'weekly' | 'monthly'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('user_summaries')
        .select('content, period_label')
        .eq('user_id', user.id)
        .eq('type', summaryType)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      if (data) setPayload(data.content as SummaryPayload)
      setLoading(false)
    }
    load()
  }, [supabase, summaryType])

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="spinner" />
    </div>
  )

  if (!payload) return null

  return (
    <SummaryPopup
      summaryId={notification.id}
      type={summaryType}
      periodLabel={(payload as { periodLabel?: string }).periodLabel ?? ''}
      payload={payload}
      onDismiss={onClose}
    />
  )
}
