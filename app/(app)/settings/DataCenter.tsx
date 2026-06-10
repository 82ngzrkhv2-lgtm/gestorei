'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DataCenter() {
  const router = useRouter()
  const supabase = createClient()
  
  const [consent, setConsent] = useState<{ terms_version: string; privacy_version: string; whatsapp_consent: boolean; accepted_at: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingConsent, setSavingConsent] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchConsent() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_consents')
        .select('terms_version, privacy_version, whatsapp_consent, accepted_at')
        .eq('user_id', user.id)
        .single()
        
      if (data) setConsent(data)
      setLoading(false)
    }
    fetchConsent()
  }, [supabase])

  async function toggleWhatsappConsent(newValue: boolean) {
    if (!consent) return
    setSavingConsent(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_consents').update({ whatsapp_consent: newValue }).eq('user_id', user.id)
      setConsent({ ...consent, whatsapp_consent: newValue })
    }
    setSavingConsent(false)
  }

  async function handleSoftDelete() {
    const confirmText = prompt('Esta ação é IRREVERSÍVEL. Digite "EXCLUIR" para anonimizar todos os seus dados e perder o acesso permanentemente.')
    if (confirmText !== 'EXCLUIR') return

    setDeleting(true)
    // Invoca a RPC segura
    const { error } = await supabase.rpc('soft_delete_account')
    
    if (error) {
      alert('Erro ao excluir conta: ' + error.message)
      setDeleting(false)
      return
    }

    // Sucesso no soft delete: destruir token e voltar pro login
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return null

  return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700 }}>Central de Dados (LGPD)</h2>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Gerencie seus consentimentos e o ciclo de vida dos seus dados na Gestorei.
      </p>

      {consent ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Informação Legal */}
          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Termos de Uso Aceitos:</span>
              <span style={{ fontWeight: 600 }}>v{consent.terms_version}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Política de Privacidade Aceita:</span>
              <span style={{ fontWeight: 600 }}>v{consent.privacy_version}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Data do Aceite:</span>
              <span style={{ fontWeight: 600 }}>{new Date(consent.accepted_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Toggle de Consentimento */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.9375rem' }}>Notificações via WhatsApp</strong>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Autorizo o envio de resumos e alertas.</span>
            </div>
            <button
              disabled={savingConsent}
              onClick={() => toggleWhatsappConsent(!consent.whatsapp_consent)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                background: consent.whatsapp_consent ? 'var(--accent)' : 'var(--bg-elevated)', transition: '0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: consent.whatsapp_consent ? 22 : 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: '0.2s'
              }} />
            </button>
          </div>

          {/* Ações Destrutivas */}
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <strong style={{ color: 'var(--accent-red)' }}>Zona de Perigo</strong>
            <button 
              onClick={() => alert('Exportação em formato CSV estará disponível em breve.')} 
              className="btn btn-ghost" 
              style={{ justifyContent: 'flex-start' }}
            >
              📥 Solicitar Cópia dos Meus Dados (Em Breve)
            </button>
            <button 
              onClick={handleSoftDelete}
              disabled={deleting}
              className="btn btn-ghost" 
              style={{ justifyContent: 'flex-start', color: 'var(--accent-red)' }}
            >
              {deleting ? 'Aguarde...' : '⚠️ Excluir Minha Conta Definitivamente'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nenhum consentimento encontrado. Verifique seu login.</p>
      )}
    </div>
  )
}
