/**
 * POST /api/summaries/preview
 *
 * Generates a summary payload for the authenticated user WITHOUT saving it.
 * Used by the Settings page "Ver preview" button.
 *
 * Body: { type: 'daily' | 'weekly' | 'monthly' }
 * Returns: { payload: SummaryPayload }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDailyMetrics, computeWeeklyMetrics, computeMonthlyMetrics } from '@/lib/metrics-engine'
import { generateDailyInsights, generateWeeklyInsights, generateMonthlyInsights } from '@/lib/insight-engine'
import {
  buildDailySummaryPayload,
  buildWeeklySummaryPayload,
  buildMonthlySummaryPayload,
} from '@/lib/notification-engine'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const type: 'daily' | 'weekly' | 'monthly' = body?.type ?? 'daily'

  const today = new Date()

  if (type === 'daily') {
    const metrics = await computeDailyMetrics(user.id, today)
    const insights = generateDailyInsights(metrics)
    const payload = buildDailySummaryPayload(metrics, insights)
    return NextResponse.json({ payload })
  }

  if (type === 'weekly') {
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() - 1)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)
    const metrics = await computeWeeklyMetrics(user.id, weekStart, weekEnd)
    const insights = generateWeeklyInsights(metrics)
    const payload = buildWeeklySummaryPayload(metrics, insights)
    return NextResponse.json({ payload })
  }

  if (type === 'monthly') {
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1)
    const metrics = await computeMonthlyMetrics(user.id, monthStart, monthEnd)
    const insights = generateMonthlyInsights(metrics)
    const payload = buildMonthlySummaryPayload(metrics, insights)
    return NextResponse.json({ payload })
  }

  return NextResponse.json({ error: 'Invalid type. Use: daily | weekly | monthly' }, { status: 400 })
}

export async function GET() {
  return NextResponse.json({
    description: 'POST /api/summaries/preview — preview a summary payload for the authenticated user',
    body: { type: 'daily | weekly | monthly' },
  })
}
