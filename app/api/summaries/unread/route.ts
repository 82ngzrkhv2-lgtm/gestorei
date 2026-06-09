/**
 * GET /api/summaries/unread
 *
 * Returns the most recent unread, non-expired summary for the authenticated user.
 * Called once when the app mounts to check for pending in-app notifications.
 *
 * Priority: monthly > weekly > daily (higher-priority summaries shown first)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ summary: null })
  }

  const now = new Date().toISOString()

  // Fetch all unread summaries — order by priority (monthly first) then recency
  const { data, error } = await supabase
    .from('user_summaries')
    .select('id, type, period_label, content, generated_at, expires_at')
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .gt('expires_at', now)
    .order('generated_at', { ascending: false })
    .limit(10)

  if (error || !data || data.length === 0) {
    return NextResponse.json({ summary: null })
  }

  // Priority order: monthly > weekly > daily
  const priority: Record<string, number> = { monthly: 0, weekly: 1, daily: 2 }
  const sorted = [...data].sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9))
  const top = sorted[0]

  return NextResponse.json({
    summary: {
      id: top.id,
      type: top.type,
      periodLabel: top.period_label,
      content: top.content,
      generatedAt: top.generated_at,
    },
  })
}
