'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConsentGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    // Evita loop infinito se já estiver na página de atualização
    if (pathname === '/update-consent') {
      setAuthorized(true)
      return
    }

    async function checkConsent() {
      // 1. Busca a versão ativa exigida
      const { data: activeVersion } = await supabase
        .from('legal_versions')
        .select('terms_version, privacy_version')
        .eq('is_active', true)
        .single()

      if (!activeVersion) {
        // Se não tem versão legal ativa configurada no banco, permite passar (fallback)
        setAuthorized(true)
        return
      }

      // 2. Busca o que o usuário assinou
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: userConsent } = await supabase
        .from('user_consents')
        .select('terms_version, privacy_version, deleted_at')
        .eq('user_id', userData.user.id)
        .single()

      // Se foi soft-deleted, desloga o usuário imediatamente
      if (userConsent?.deleted_at) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      // Se não tem consentimento, ou se as versões são menores/diferentes da exigida
      if (!userConsent || userConsent.terms_version !== activeVersion.terms_version || userConsent.privacy_version !== activeVersion.privacy_version) {
        router.push('/update-consent')
      } else {
        setAuthorized(true)
      }
    }

    checkConsent()
  }, [supabase, router, pathname])

  if (!authorized) {
    // Retorna uma tela em branco ou skeleton enquanto checa silenciosamente para não piscar a interface antiga
    return <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }} />
  }

  return <>{children}</>
}
