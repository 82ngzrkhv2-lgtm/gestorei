/**
 * POST /api/summaries/send-daily
 *
 * Triggered by Vercel cron (vercel.json) or manually.
 * Protected by SUMMARY_CRON_SECRET header.
 *
 * Fetches all users with daily_summary_enabled = true,
 * computes metrics, generates insights, builds the message
 * and sends via WhatsApp.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDailyMetrics } from '@/lib/metrics-engine'
import { generateDailyInsights } from '@/lib/insight-engine'
import { buildDailySummaryMessage } from '@/lib/notification-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
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
    .eq('daily_summary_enabled', true)
    .neq('whatsapp_number', '')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today = new Date()
  const results = []

  for (const s of settings ?? []) {
    try {
      const metrics = await computeDailyMetrics(s.user_id, today)
      const insights = generateDailyInsights(metrics)
      const message = buildDailySummaryMessage(metrics, insights)
      const result = await sendWhatsAppMessage(s.whatsapp_number, message)
      results.push({ userId: s.user_id, ...result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ userId: s.user_id, success: false, error: msg })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}


