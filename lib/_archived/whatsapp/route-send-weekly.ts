/**
 * POST /api/summaries/send-weekly
 *
 * Triggered by Vercel cron every Saturday at 09:00 UTC (06:00 BRT).
 * Protected by SUMMARY_CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeWeeklyMetrics } from '@/lib/metrics-engine'
import { generateWeeklyInsights } from '@/lib/insight-engine'
import { buildWeeklySummaryMessage } from '@/lib/notification-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() - 1) // yesterday (Friday)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekEnd.getDate() - 6) // 7 days ago
  void day
  return { weekStart, weekEnd }
}

export async function POST(req: NextRequest) {
  return handler(req)
}

// Vercel cron jobs use GET
export async function GET(req: NextRequest) {
  return handler(req)
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: settings, error } = await supabase
    .from('user_summary_settings')
    .select('user_id, whatsapp_number')
    .eq('weekly_summary_enabled', true)
    .neq('whatsapp_number', '')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { weekStart, weekEnd } = getCurrentWeekRange()
  const results = []

  for (const s of settings ?? []) {
    try {
      const metrics = await computeWeeklyMetrics(s.user_id, weekStart, weekEnd)
      const insights = generateWeeklyInsights(metrics)
      const message = buildWeeklySummaryMessage(metrics, insights)
      const result = await sendWhatsAppMessage(s.whatsapp_number, message)
      results.push({ userId: s.user_id, ...result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ userId: s.user_id, success: false, error: msg })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}
