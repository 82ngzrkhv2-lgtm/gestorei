/**
 * POST /api/summaries/send-monthly
 *
 * Triggered by Vercel cron on the 1st of every month at 08:00 UTC.
 * Protected by SUMMARY_CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeMonthlyMetrics } from '@/lib/metrics-engine'
import { generateMonthlyInsights } from '@/lib/insight-engine'
import { buildMonthlySummaryMessage } from '@/lib/notification-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

function getLastMonthRange(): { monthStart: Date; monthEnd: Date } {
  const today = new Date()
  // last day of previous month
  const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  // first day of previous month
  const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1)
  return { monthStart, monthEnd }
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
    .eq('monthly_summary_enabled', true)
    .neq('whatsapp_number', '')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { monthStart, monthEnd } = getLastMonthRange()
  const results = []

  for (const s of settings ?? []) {
    try {
      const metrics = await computeMonthlyMetrics(s.user_id, monthStart, monthEnd)
      const insights = generateMonthlyInsights(metrics)
      const message = buildMonthlySummaryMessage(metrics, insights)
      const result = await sendWhatsAppMessage(s.whatsapp_number, message)
      results.push({ userId: s.user_id, ...result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ userId: s.user_id, success: false, error: msg })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}
