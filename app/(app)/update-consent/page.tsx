'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function UpdateConsentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTerms, setActiveTerms] = useState('')
  const [activePrivacy, setActivePrivacy] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadActiveVersions() {
      const { data, error } = await supabase
        .from('legal_versions')
        .select('terms_version, privacy_version')
        .eq('is_active', true)
        .single()

      if (data) {
        setActiveTerms(data.terms_version)
        setActivePrivacy(data.privacy_version)
      } else {
        setError('Não foi possível carregar os novos termos.')
      }
      setLoading(false)
    }
    loadActiveVersions()
  }, [supabase])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!agreedToTerms || !agreedToPrivacy) return
    setSubmitting(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push('/login')
      return
    }

    // Pega o IP hash via uma rota simples ou atualiza sem IP hash na reaceitação (ou usamos a mesma API /register se adaptada).
    // Para simplificar a reaceitação (o IP real hash já foi pego no signup), atualizamos apenas os termos e a data.
    const { error } = await supabase
      .from('user_consents')
      .update({
        terms_version: activeTerms,
        privacy_version: activePrivacy,
        accepted_at: new Date().toISOString()
      })
      .eq('user_id', userData.user.id)

    if (error) {
      setError('Erro ao salvar os consentimentos. Tente novamente.')
      setSubmitting(false)
    } else {
      // Força um refresh para limpar o estado do layout e permitir entrada
      window.location.href = '/dashboard'
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}><div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} /></div>
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '1.5rem' }}>
      <div className="glass-card" style={{ maxWidth: 480, width: '100%', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
        </div>
        
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Nossos Termos Mudaram</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
            A Gestorei atualizou seus termos legais para oferecer mais segurança e transparência. Para continuar utilizando seu cockpit financeiro, precisamos do seu aceite nas novas versões.
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-critical" style={{ borderRadius: 8 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.875rem' }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 2 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Li e concordo com os <Link href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>Termos de Uso</Link> (v{activeTerms}).
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={agreedToPrivacy} onChange={e => setAgreedToPrivacy(e.target.checked)} style={{ marginTop: 2 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Li e concordo com a <Link href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>Política de Privacidade</Link> (v{activePrivacy}).
              </span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting || !agreedToTerms || !agreedToPrivacy} style={{ height: '3.25rem', marginTop: '0.5rem' }}>
            {submitting ? 'Salvando...' : 'Aceitar e Continuar'}
          </button>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="btn btn-ghost" style={{ height: '3.25rem' }}>
            Fazer logoff
          </button>
        </form>
      </div>
    </div>
  )
}
