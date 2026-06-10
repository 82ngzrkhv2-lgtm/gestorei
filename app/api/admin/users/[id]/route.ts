import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, getAdminClient, logAdminAction, UnauthorizedException } from '@/lib/server/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await validateAdminRequest(req)
    const admin   = getAdminClient()
    const { id }  = await params
    const body    = await req.json()
    const { action } = body as { action: string }

    const commonActions = ['suspend', 'activate', 'block', 'grant_trial', 'revoke_access']
    const superActions  = ['alter_role', 'promote_admin']

    if (superActions.includes(action) && session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Apenas super_admin pode realizar esta ação.' }, { status: 403 })
    }

    if (!commonActions.includes(action) && !superActions.includes(action)) {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
    }

    let updateError: unknown = null
    if (action === 'suspend') {
      const { error } = await admin.from('profiles').update({ status: 'suspended' }).eq('id', id)
      updateError = error
    } else if (action === 'activate') {
      const { error } = await admin.from('profiles').update({ status: 'active' }).eq('id', id)
      updateError = error
    } else if (action === 'block') {
      const { error } = await admin.from('profiles').update({ status: 'blocked' }).eq('id', id)
      updateError = error
    } else if (action === 'grant_trial') {
      const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await admin
        .from('subscriptions')
        .upsert({ user_id: id, status: 'trial', trial_ends_at: trialEnds }, { onConflict: 'user_id' })
      updateError = error
    } else if (action === 'alter_role' && body.role) {
      const { error } = await admin
        .from('user_roles')
        .upsert({ user_id: id, role: body.role }, { onConflict: 'user_id' })
      updateError = error
    }

    if (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    await logAdminAction(session.userId, action, id, body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
