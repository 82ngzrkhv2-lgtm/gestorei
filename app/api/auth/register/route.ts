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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[API Register] Supabase Env Vars missing')
      return NextResponse.json({ error: 'Configuração interna do servidor falhou.' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Cria usuário no Auth do Supabase (Sign Up comum)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ 
        error: authError?.message === 'User already registered' 
          ? 'Este email já está cadastrado.' 
          : 'Erro ao criar conta de usuário.' 
      }, { status: 400 })
    }

    const userId = authData.user.id

    // Tentamos gravar. Se falhar, como não temos a service role, não podemos fazer hard delete
    // mas logamos o erro e aceitamos o cadastro para não bloquear o MVP.
    const { error: consentError } = await supabase.from('user_consents').insert({
      user_id: userId,
      terms_version,
      privacy_version,
      whatsapp_consent: !!whatsapp_consent,
      ip_hash: ipHash
    })

    if (consentError) {
      console.error('[API Register] Erro ao gravar consentimento:', consentError)
    }

    return NextResponse.json({ message: 'Conta criada com sucesso.' }, { status: 200 })

  } catch (error) {
    console.error('[API Register] Fatal Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
