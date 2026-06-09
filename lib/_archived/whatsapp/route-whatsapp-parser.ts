import { NextRequest, NextResponse } from 'next/server'
import { parseWhatsappMessage } from '@/lib/whatsapp-parser'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/whatsapp-parser
 *
 * Accepts a structured WhatsApp message and returns a parsed transaction.
 * In MVP: parsing only. Does NOT auto-save — returns JSON for the client to confirm & save.
 *
 * Body: { "message": "#saida 320 facebookads" }
 * Future: integrate with Evolution API webhooks here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message: string = body?.message ?? ''

    if (!message) {
      return NextResponse.json({ error: 'Campo "message" é obrigatório.' }, { status: 400 })
    }

    const parsed = parseWhatsappMessage(message)

    if (!parsed.parsed) {
      return NextResponse.json({ error: parsed.error, parsed: false }, { status: 422 })
    }

    // Optionally auto-save if auth token provided
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Find matching account by hint
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_active', true)

        const matched = accounts?.find(a =>
          a.name.toLowerCase().replace(/\s/g, '') === parsed.accountHint.toLowerCase().replace(/\s/g, '')
        )

        if (matched) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            account_id: matched.id,
            type: parsed.type,
            amount: parsed.amount,
            description: `Via WhatsApp: ${parsed.rawMessage}`,
            source: 'whatsapp',
          })

          const delta = parsed.type === 'income' ? parsed.amount : -parsed.amount
          const { data: acc } = await supabase.from('accounts').select('balance').eq('id', matched.id).single()
          if (acc) {
            await supabase.from('accounts').update({ balance: Number(acc.balance) + delta, updated_at: new Date().toISOString() }).eq('id', matched.id)
          }

          return NextResponse.json({ ...parsed, saved: true, accountId: matched.id, accountName: matched.name })
        }
      }
    }

    return NextResponse.json({ ...parsed, saved: false })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    usage: 'POST /api/whatsapp-parser',
    body: { message: '#saida 320 facebookads' },
    formats: ['#saida <valor> <conta>', '#entrada <valor> <conta>'],
    example: '#entrada 1200 cliente',
  })
}
