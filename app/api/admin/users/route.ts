import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, getAdminClient, UnauthorizedException } from '@/lib/server/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/users — returns user list from profiles (never auth.users directly)
export async function GET(req: NextRequest) {
  try {
    const session = await validateAdminRequest(req)
    const admin   = getAdminClient()

    const { data, error } = await admin
      .from('profiles')
      .select(`
        id, name, email, status, created_at, last_sign_in_at, last_activity_at,
        user_roles ( role ),
        subscriptions ( status, plan_name, trial_ends_at )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Never expose financial data — only operational metadata
    return NextResponse.json({ users: data, adminRole: session.role })
  } catch (err) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

