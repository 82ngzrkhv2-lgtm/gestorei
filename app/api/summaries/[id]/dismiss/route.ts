/**
 * PATCH /api/summaries/[id]/dismiss
 *
 * Marks a summary as read (sets dismissed_at = now).
 * Called when the user closes the SummaryPopup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('user_summaries')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id) // safety: only own summaries

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dismissed: true })
}
