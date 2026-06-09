'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha inválidos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', marginBottom: '0.5rem' }}>
          Acessar Gestorei
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Bem-vindo de volta. Pronto para dominar suas finanças?
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="input-label" htmlFor="login-email">Email profissional</label>
          <input
            id="login-email"
            className="input"
            type="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ height: '3rem', fontSize: '1rem' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="input-label" htmlFor="login-password">Senha</label>
            {/* Future improvement: Forgot password link */}
          </div>
          <input
            id="login-password"
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ height: '3rem', fontSize: '1rem', letterSpacing: password ? '0.2em' : 'normal' }}
          />
        </div>

        {error && (
          <div className="alert-banner alert-critical" role="alert" style={{ borderRadius: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <button
          id="login-submit"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ height: '3.25rem', fontSize: '1.0625rem', marginTop: '0.5rem', borderRadius: 12, fontWeight: 700 }}
        >
          {loading ? (
            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25"/>
              <path d="M21 12a9 9 0 00-9-9"/>
            </svg>
          ) : (
            'Entrar no sistema'
          )}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Ainda não tem uma conta?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s' }}>
            Começar grátis
          </Link>
        </p>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
