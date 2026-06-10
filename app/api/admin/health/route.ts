import { NextResponse } from 'next/server'
import { validateAdminRequest, getAdminClient, UnauthorizedException } from '@/lib/server/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/health — returns last run of each cron job from system_health_logs
export async function GET() {
  try {
    await validateAdminRequest()
    const admin = getAdminClient()

    // Get the most recent log per job
    const { data, error } = await admin
      .from('system_health_logs')
      .select('job_name, status, duration_ms, records_processed, error_message, executed_at')
      .order('executed_at', { ascending: false })
      .limit(30)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate: keep only the most recent entry per job_name
    const seen = new Set<string>()
    const logs = (data ?? []).filter(l => {
      if (seen.has(l.job_name)) return false
      seen.add(l.job_name)
      return true
    })

    return NextResponse.json({ logs })
  } catch (err) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
