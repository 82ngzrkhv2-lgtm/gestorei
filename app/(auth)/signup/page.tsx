'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message === 'User already registered' ? 'Este email já está cadastrado.' : error.message)
      setLoading(false)
    } else {
      // Try to sign in directly
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  if (success) {
    return (
      <div className="glass-card animate-scale-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ marginBottom: '0.5rem' }}>Conta criada!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Verifique seu email para confirmar o cadastro.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="glass-card animate-scale-in" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
          Criar conta
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Comece a ter controle real do seu dinheiro
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="input-label" htmlFor="signup-name">Nome</label>
          <input
            id="signup-name"
            className="input"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={e => setName(e.target.value)}
            required
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
          />
        </div>

        <div>
          <label className="input-label" htmlFor="signup-password">Senha</label>
          <input
            id="signup-password"
            className="input"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="alert-banner alert-critical" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <button
          id="signup-submit"
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={loading}
          style={{ marginTop: '0.25rem', width: '100%' }}
        >
          {loading ? 'Criando conta...' : 'Criar conta grátis'}
        </button>
      </form>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
        3 contas criadas automaticamente para você começar 🚀
      </p>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
