/**
 * POST /api/summaries/preview
 *
 * Generates a summary message for the authenticated user WITHOUT sending it.
 * Used by the Settings page "Enviar preview agora" button.
 *
 * Body: { type: 'daily' | 'weekly' | 'monthly', send?: boolean }
 * - send=true will also dispatch the WhatsApp message
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDailyMetrics, computeWeeklyMetrics, computeMonthlyMetrics } from '@/lib/metrics-engine'
import { generateDailyInsights, generateWeeklyInsights, generateMonthlyInsights } from '@/lib/insight-engine'
import {
  buildDailySummaryMessage,
  buildWeeklySummaryMessage,
  buildMonthlySummaryMessage,
} from '@/lib/notification-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const type: 'daily' | 'weekly' | 'monthly' = body?.type ?? 'daily'
  const shouldSend: boolean = body?.send === true

  const today = new Date()
  let message = ''

  if (type === 'daily') {
    const metrics = await computeDailyMetrics(user.id, today)
    const insights = generateDailyInsights(metrics)
    message = buildDailySummaryMessage(metrics, insights)

  } else if (type === 'weekly') {
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() - 1)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)
    const metrics = await computeWeeklyMetrics(user.id, weekStart, weekEnd)
    const insights = generateWeeklyInsights(metrics)
    message = buildWeeklySummaryMessage(metrics, insights)

  } else if (type === 'monthly') {
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1)
    const metrics = await computeMonthlyMetrics(user.id, monthStart, monthEnd)
    const insights = generateMonthlyInsights(metrics)
    message = buildMonthlySummaryMessage(metrics, insights)
  }

  if (shouldSend) {
    const { data: settings } = await supabase
      .from('user_summary_settings')
      .select('whatsapp_number')
      .eq('user_id', user.id)
      .single()

    if (!settings?.whatsapp_number) {
      return NextResponse.json({ error: 'Número de WhatsApp não configurado.' }, { status: 400 })
    }

    const result = await sendWhatsAppMessage(settings.whatsapp_number, message)
    return NextResponse.json({ message, sent: result.success, error: result.error })
  }

  return NextResponse.json({ message, sent: false })
}

export async function GET() {
  return NextResponse.json({
    description: 'POST /api/summaries/preview — preview or send a summary for the authenticated user',
    body: { type: 'daily | weekly | monthly', send: 'boolean (optional, default false)' },
  })
}
