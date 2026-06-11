'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    if (password.length < 8) {
      setError('Sua senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (!agreedToTerms) {
      setError('Por favor, confirme que concorda com os termos.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          terms_version: '1.0',
          privacy_version: '1.0'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Não foi possível criar sua conta.')
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      
      trackEvent('signup_completed', { email })

      if (!signInError) {
        router.push('/onboarding')
        router.refresh()
      } else {
        setSuccess(true)
        setLoading(false)
      }

    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Verifique seu email</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          Enviamos um link para <b>{email}</b>. Clique nele para ativar seu espaço.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ width: '100%', height: '3rem', borderRadius: 12 }}>
          Ir para Login
        </Link>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
          Tudo em seu lugar.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Crie seu espaço.
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="input-label" htmlFor="signup-name">Nome</label>
          <input
            id="signup-name"
            className="input"
            type="text"
            placeholder="Como devemos chamar você?"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ height: '2.875rem' }}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            className="input"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ height: '2.875rem' }}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="signup-password">Senha</label>
          <input
            id="signup-password"
            className="input"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ height: '2.875rem', letterSpacing: password ? '0.1em' : 'normal' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}>
          <input 
            type="checkbox" 
            checked={agreedToTerms} 
            onChange={e => setAgreedToTerms(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Concordo com os <Link href="/terms" target="_blank" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Termos de Uso</Link> e a <Link href="/privacy" target="_blank" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Política de Privacidade</Link>.
          </span>
        </label>

        {error && (
          <div style={{ color: 'var(--accent-red)', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !agreedToTerms}
          style={{ height: '3rem', width: '100%', borderRadius: 12, marginTop: '0.5rem', background: 'var(--text-primary)', color: 'var(--bg-card)' }}
        >
          {loading ? 'Criando espaço...' : 'Continuar'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Já tem uma conta?{' '}
          <Link href="/login" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Fazer login
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
