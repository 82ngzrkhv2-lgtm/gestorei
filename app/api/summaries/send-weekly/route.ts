import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeWeeklyMetrics } from '@/lib/metrics-engine'
import { generateWeeklyInsights } from '@/lib/insight-engine'
import { buildWeeklySummaryPayload } from '@/lib/notification-engine'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getCurrentWeekRange() {
  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() - 1)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekEnd.getDate() - 6)
  return { weekStart, weekEnd }
}

export async function POST(req: NextRequest) { return handler(req) }
export async function GET(req: NextRequest)  { return handler(req) }

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const startTime = Date.now()
  const supabase  = getServiceClient()

  const { data: settings, error } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('weekly_summary_enabled', true)

  if (error) {
    await logHealth(supabase, 'send-weekly', 'error', Date.now() - startTime, 0, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()
  const { weekStart, weekEnd } = getCurrentWeekRange()
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000)
  const results   = []

  for (const s of settings ?? []) {
    try {
      const metrics  = await computeWeeklyMetrics(s.user_id, weekStart, weekEnd)
      const insights = generateWeeklyInsights(metrics)
      const content  = buildWeeklySummaryPayload(metrics, insights)

      const { error: upsertError } = await supabase
        .from('user_summaries')
        .upsert(
          { user_id: s.user_id, type: 'weekly', period_label: content.periodLabel, content, generated_at: now.toISOString(), dismissed_at: null, expires_at: expiresAt.toISOString() },
          { onConflict: 'user_id,type', ignoreDuplicates: false }
        )

      if (upsertError) throw upsertError

      await supabase.from('notifications').insert({
        user_id: s.user_id, type: 'weekly_ready',
        title: '📈 Resumo semanal disponível',
        message: `Seu resumo financeiro de ${content.periodLabel} está pronto.`,
        payload: { summaryType: 'weekly' }, priority: 'push', read: false,
      })

      results.push({ userId: s.user_id, success: true })
    } catch (err) {
      results.push({ userId: s.user_id, success: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  await logHealth(supabase, 'send-weekly', 'ok', Date.now() - startTime, results.length)
  return NextResponse.json({ generated: results.length, results })
}

async function logHealth(supabase: ReturnType<typeof getServiceClient>, jobName: string, status: 'ok'|'error', durationMs: number, recordsProcessed: number, errorMessage?: string) {
  await supabase.from('system_health_logs').insert({ job_name: jobName, status, duration_ms: durationMs, records_processed: recordsProcessed, error_message: errorMessage ?? null })
}
