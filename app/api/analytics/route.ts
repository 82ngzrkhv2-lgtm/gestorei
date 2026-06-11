import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventName, payload } = body

    if (!eventName) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    const { error } = await supabase.from('user_events').insert({
      user_id: user.id,
      event_type: eventName,
      payload: payload || {}
    })

    if (error) {
      console.error('[API Analytics] Error inserting event:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[API Analytics] Fatal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
