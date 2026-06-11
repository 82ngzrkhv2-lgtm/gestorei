'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState('')

  useEffect(() => {
    async function runInvisibleOnboarding() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        // 1. Verificar se já completou
        const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).single()
        if (roleData && roleData.role === 'user') {
          router.push('/dashboard')
          return
        }

        // 2. Criar Núcleos padrão (Pessoal, Reserva, Trabalho)
        const accountsToInsert = [
          { user_id: user.id, name: 'Pessoal', color: '#10b981', icon: 'wallet', type: 'personal', balance: 0, is_active: true },
          { user_id: user.id, name: 'Reserva', color: '#3b82f6', icon: 'piggy-bank', type: 'reserve', balance: 0, is_active: true },
          { user_id: user.id, name: 'Trabalho', color: '#f59e0b', icon: 'briefcase', type: 'business', balance: 0, is_active: true }
        ]
        const { error: dbError } = await supabase.from('accounts').insert(accountsToInsert)
        if (dbError) throw dbError

        // 3. Criar Categorias padrão pedidas na FASE 2
        const categoriesToInsert = [
          // Saídas
          { user_id: user.id, name: 'Alimentação', color: '#f59e0b', icon: 'utensils', type: 'expense' },
          { user_id: user.id, name: 'Transporte', color: '#6366f1', icon: 'car', type: 'expense' },
          { user_id: user.id, name: 'Casa', color: '#8b5cf6', icon: 'home', type: 'expense' },
          { user_id: user.id, name: 'Lazer', color: '#ec4899', icon: 'smile', type: 'expense' },
          { user_id: user.id, name: 'Saúde', color: '#10b981', icon: 'heart', type: 'expense' },
          { user_id: user.id, name: 'Compras', color: '#ec4899', icon: 'shopping-bag', type: 'expense' },
          // Entradas
          { user_id: user.id, name: 'Salário', color: '#10b981', icon: 'dollar-sign', type: 'income' },
          { user_id: user.id, name: 'Freelance', color: '#f59e0b', icon: 'briefcase', type: 'income' },
          { user_id: user.id, name: 'Venda', color: '#3b82f6', icon: 'shopping-cart', type: 'income' },
          { user_id: user.id, name: 'Extra', color: '#8b5cf6', icon: 'plus', type: 'income' }
        ]
        await supabase.from('categories').insert(categoriesToInsert)

        // 4. Concluir Onboarding
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'user' }, { onConflict: 'user_id' })
        
        // Tracking básico
        trackEvent('onboarding_completed')

        // Redirecionar com flag de primeira visita para abrir o Fast Entry
        router.push('/dashboard?welcome=true')
      } catch (err: any) {
        setError(err.message || 'Erro ao preparar seu espaço.')
      }
    }

    runInvisibleOnboarding()
  }, [router, supabase])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '2rem 1.5rem', background: 'var(--bg-base)' }}>
      {error ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--accent-red)' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Tentar novamente</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Criamos alguns núcleos pra você começar sem perder tempo.
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Preparando seu espaço...</p>
        </div>
      )}
    </div>
  )
}
