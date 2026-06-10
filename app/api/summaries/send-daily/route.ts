/**
 * POST /api/summaries/send-daily
 *
 * Triggered by Vercel cron (vercel.json) — 0 23 * * * (23:00 UTC = 20:00 BRT)
 * Protected by CRON_SECRET header.
 *
 * For each user with daily_summary_enabled = true:
 *   1. Computes daily metrics
 *   2. Generates insights
 *   3. Builds structured payload → saves to user_summaries (analytical history)
 *   4. Inserts a 'daily_ready' notification into notifications table (inbox feed)
 *   5. Logs execution to system_health_logs
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeDailyMetrics } from '@/lib/metrics-engine'
import { generateDailyInsights } from '@/lib/insight-engine'
import { buildDailySummaryPayload } from '@/lib/notification-engine'

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

export async function POST(req: NextRequest) { return handler(req) }
export async function GET(req: NextRequest)  { return handler(req) }

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const supabase = getServiceClient()

  const { data: settings, error } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('daily_summary_enabled', true)

  if (error) {
    await logHealth(supabase, 'send-daily', 'error', Date.now() - startTime, 0, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today     = new Date()
  const expiresAt = new Date(today.getTime() + 28 * 60 * 60 * 1000)
  const results   = []

  for (const s of settings ?? []) {
    try {
      const metrics = await computeDailyMetrics(s.user_id, today)
      const insights = generateDailyInsights(metrics)
      const content  = buildDailySummaryPayload(metrics, insights)

      // 1. Save analytical summary (permanent history)
      const { error: upsertError } = await supabase
        .from('user_summaries')
        .upsert(
          {
            user_id:      s.user_id,
            type:         'daily',
            period_label: content.periodLabel,
            content,
            generated_at: today.toISOString(),
            dismissed_at: null,
            expires_at:   expiresAt.toISOString(),
          },
          { onConflict: 'user_id,type', ignoreDuplicates: false }
        )

      if (upsertError) throw upsertError

      // 2. Insert inbox notification (delivery layer)
      await supabase.from('notifications').insert({
        user_id:  s.user_id,
        type:     'daily_ready',
        title:    '📊 Resumo diário disponível',
        message:  `Seu resumo financeiro de ${content.periodLabel} está pronto.`,
        payload:  { summaryType: 'daily' },
        priority: 'push',
        read:     false,
      })

      results.push({ userId: s.user_id, success: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ userId: s.user_id, success: false, error: msg })
    }
  }

  // 3. Log health
  await logHealth(supabase, 'send-daily', 'ok', Date.now() - startTime, results.length)
  return NextResponse.json({ generated: results.length, results })
}

async function logHealth(
  supabase: ReturnType<typeof getServiceClient>,
  jobName: string,
  status: 'ok' | 'error',
  durationMs: number,
  recordsProcessed: number,
  errorMessage?: string
) {
  await supabase.from('system_health_logs').insert({
    job_name: jobName,
    status,
    duration_ms: durationMs,
    records_processed: recordsProcessed,
    error_message: errorMessage ?? null,
  })
}
