import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, getAdminClient, UnauthorizedException } from '@/lib/server/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await validateAdminRequest(req)
    const admin = getAdminClient()

    // 1. Total Transactions
    const { count: totalTransactions } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    // 2. Active D1 & D7 (using user_events)
    const d1Date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const d7Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: d1Events } = await admin
      .from('user_events')
      .select('user_id')
      .gte('created_at', d1Date)

    const { data: d7Events } = await admin
      .from('user_events')
      .select('user_id')
      .gte('created_at', d7Date)

    // Calculate unique users
    const activeD1 = new Set(d1Events?.map(e => e.user_id)).size
    const activeD7 = new Set(d7Events?.map(e => e.user_id)).size

    return NextResponse.json({ 
      totalTransactions: totalTransactions || 0,
      activeD1,
      activeD7
    }, { status: 200 })

  } catch (err) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
