'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Consents & Legal
  const [termsVersion, setTermsVersion] = useState<string>('1.0')
  const [privacyVersion, setPrivacyVersion] = useState<string>('1.0')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [whatsappConsent, setWhatsappConsent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Password strength visual indicator
  const isPasswordStrong = password.length >= 8

  // Fetch active legal versions on mount
  useEffect(() => {
    async function fetchVersions() {
      const { data } = await supabase
        .from('legal_versions')
        .select('terms_version, privacy_version')
        .eq('is_active', true)
        .single()
      
      if (data) {
        setTermsVersion(data.terms_version)
        setPrivacyVersion(data.privacy_version)
      }
    }
    fetchVersions()
  }, [supabase])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    if (!isPasswordStrong) {
      setError('A senha deve ter pelo menos 8 caracteres para sua segurança.')
      return
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setError('Você precisa concordar com os Termos e a Política de Privacidade.')
      return
    }

    setLoading(true)

    try {
      // Usando nossa nova API Server-Side para garantir IP Hash e gravação segura
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          terms_version: termsVersion,
          privacy_version: privacyVersion,
          whatsapp_consent: whatsappConsent
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta.')
        setLoading(false)
        return
      }

      // Se API Ok, o usuário foi criado. Mas ele não está logado no cliente ainda.
      // Tentamos o signInWithPassword. Se falhar por e-mail não confirmado, exibimos a tela de sucesso.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (!signInError) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setSuccess(true)
        setLoading(false)
      }

    } catch (err) {
      setError('Falha de conexão com o servidor.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ width: '100%', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ 
          width: 64, height: 64, background: 'rgba(16,185,129,0.15)', color: '#10b981', 
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          margin: '0 auto 1.5rem', border: '1px solid rgba(16,185,129,0.3)' 
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>Verifique seu email</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          Acabamos de enviar um link de confirmação para <b>{email}</b>. Clique nele para ativar seu cockpit financeiro.
        </p>
        <Link href="/login" className="btn btn-ghost" style={{ width: '100%', height: '3.25rem', fontSize: '1.0625rem', borderRadius: 12 }}>
          Voltar para o Login
        </Link>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', marginBottom: '0.5rem' }}>
          Criar sua conta
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Descubra para onde seu dinheiro está indo, em 2 minutos.
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="input-label" htmlFor="signup-name">Nome completo</label>
          <input
            id="signup-name"
            className="input"
            type="text"
            placeholder="Como devemos chamar você?"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ height: '3rem', fontSize: '1rem' }}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="signup-email">Email principal</label>
          <input
            id="signup-email"
            className="input"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ height: '3rem', fontSize: '1rem' }}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="signup-password">Senha segura</label>
          <input
            id="signup-password"
            className="input"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ 
              height: '3rem', fontSize: '1rem', 
              letterSpacing: password ? '0.2em' : 'normal',
              borderColor: password && !isPasswordStrong ? 'var(--accent-red)' : password && isPasswordStrong ? 'var(--accent-green)' : ''
            }}
          />
          {password && !isPasswordStrong && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--accent-red)' }}>A senha precisa ter pelo menos 8 caracteres.</p>
          )}
        </div>

        {/* Módulo de Termos e Consentimentos LGPD */}
        <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Sua Privacidade (LGPD)</p>
          
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.875rem' }}>
            <input 
              type="checkbox" 
              checked={agreedToTerms} 
              onChange={e => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Li e concordo com os <Link href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>Termos de Uso</Link> (v{termsVersion}).
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.875rem' }}>
            <input 
              type="checkbox" 
              checked={agreedToPrivacy} 
              onChange={e => setAgreedToPrivacy(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Li e concordo com a <Link href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>Política de Privacidade</Link> (v{privacyVersion}).
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={whatsappConsent} 
              onChange={e => setWhatsappConsent(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <b>(Opcional)</b> Autorizo receber notificações, alertas e resumos financeiros no meu WhatsApp.
            </span>
          </label>
        </div>

        {error && (
          <div className="alert-banner alert-critical" role="alert" style={{ borderRadius: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <div style={{ marginTop: '0.5rem' }}>
          <button
            id="signup-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || (password.length > 0 && !isPasswordStrong) || !agreedToTerms || !agreedToPrivacy}
            style={{ height: '3.25rem', fontSize: '1.0625rem', width: '100%', borderRadius: 12, fontWeight: 700 }}
          >
            {loading ? (
              <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
            ) : (
              'Começar grátis e parar de perder dinheiro'
            )}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span>🔒 Sem cartão de crédito</span>
            <span>•</span>
            <span>Cancele com 1 clique</span>
          </p>
        </div>
      </form>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Já possui uma conta?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Fazer login
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
