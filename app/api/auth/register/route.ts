import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, terms_version, privacy_version, whatsapp_consent } = await req.json()

    if (!email || !password || !name || !terms_version || !privacy_version) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    // Pega o IP real, evitando proxies/load balancers se possível
    const ip = req.headers.get('x-forwarded-for') || '0.0.0.0'
    
    // Hash do IP com salt para proteção LGPD (minimizar retenção de dados)
    const ipHash = crypto.createHash('sha256').update(ip + process.env.NEXT_PUBLIC_SUPABASE_URL).digest('hex')

    // Criação do Supabase Admin Client para bypass RLS no momento de registro
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API Register] Supabase Env Vars missing')
      return NextResponse.json({ error: 'Configuração interna do servidor falhou.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Cria usuário no Auth do Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Força a verificação de e-mail (depende da config do Supabase também)
      user_metadata: { name }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ 
        error: authError?.message === 'User already registered' 
          ? 'Este email já está cadastrado.' 
          : 'Erro ao criar conta de usuário.' 
      }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Grava os consentimentos no banco de dados vinculados ao usuário
    const { error: consentError } = await supabaseAdmin.from('user_consents').insert({
      user_id: userId,
      terms_version,
      privacy_version,
      whatsapp_consent: !!whatsapp_consent,
      ip_hash: ipHash
    })

    if (consentError) {
      console.error('[API Register] Erro ao gravar consentimento:', consentError)
      // Soft-delete manual do auth se falhar a gravação do termo
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erro ao processar consentimentos jurídicos.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Conta criada com sucesso.' }, { status: 200 })

  } catch (error) {
    console.error('[API Register] Fatal Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
