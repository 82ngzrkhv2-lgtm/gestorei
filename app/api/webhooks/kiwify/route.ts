import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/kiwify
 * 
 * Endpoint preparado para receber webhooks da Kiwify.
 * Eventos principais a serem tratados:
 * - order_approved (Pagamento aprovado)
 * - subscription_canceled (Assinatura cancelada)
 * - subscription_renewed (Renovação aprovada)
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    // Safety check so it doesn't crash if env vars are missing
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Kiwify Webhook] Supabase env vars are missing')
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    // 1. Opcional: Validar assinatura/token do Webhook da Kiwify
    const signature = req.headers.get('x-kiwify-signature')
    // TODO: Implementar validação de assinatura se configurado na Kiwify

    const body = await req.json()
    const { order_status, Customer, Subscription, webhook_event_type } = body

    if (!Customer?.email) {
      return NextResponse.json({ error: 'Email do cliente não fornecido' }, { status: 400 })
    }

    // Identifica o usuário no Supabase através do e-mail de compra
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth.users') // Na prática, dependendo das views, ou busca direto em profiles
      .select('id')
      .eq('email', Customer.email)
      .single()

    if (userError || !userData) {
      console.warn(`[Kiwify Webhook] Usuário não encontrado para o email: ${Customer.email}`)
      // Dependendo da regra de negócios, pode-se criar o usuário automaticamente aqui.
      return NextResponse.json({ message: 'Usuário não encontrado. Ignorando evento.' }, { status: 200 })
    }

    const userId = userData.id

    // Tratar eventos de assinatura
    if (webhook_event_type === 'order_approved' || webhook_event_type === 'subscription_renewed') {
      
      const expiresAt = new Date()
      // Se for assinatura mensal (exemplo padrão), adiciona 30 dias
      expiresAt.setDate(expiresAt.getDate() + 30)

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: userId,
        kiwify_subscription_id: Subscription?.id || `order_${body.order_id}`,
        kiwify_customer_email: Customer.email,
        plan_name: body.product_name || 'Premium',
        status: 'active',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'kiwify_subscription_id' })

      return NextResponse.json({ message: 'Assinatura ativada/renovada com sucesso.' }, { status: 200 })
    }

    if (webhook_event_type === 'subscription_canceled') {
      await supabaseAdmin.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('kiwify_subscription_id', Subscription?.id)

      return NextResponse.json({ message: 'Assinatura cancelada.' }, { status: 200 })
    }

    // Outros eventos
    return NextResponse.json({ message: 'Evento ignorado.' }, { status: 200 })

  } catch (error) {
    console.error('[Kiwify Webhook] Erro ao processar:', error)
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 })
  }
}
