import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/notifications/subscribe — register PWA push subscription
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { subscription } = body

  if (!subscription || typeof subscription !== 'object') {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ user_id: user.id, subscription_json: subscription })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/notifications/subscribe — remove current device subscription
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const endpoint = body?.endpoint

  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .filter('subscription_json->endpoint', 'eq', endpoint)

  return NextResponse.json({ ok: true })
}
