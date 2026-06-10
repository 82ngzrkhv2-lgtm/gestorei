export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '4rem 1.5rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Política de Privacidade</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Última atualização: Junho de 2026 (v1.0)</p>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>1. Nosso Compromisso Principal</h2>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: 12, marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: 'var(--accent)', margin: 0, fontSize: '1.125rem' }}>
            A Gestorei não comercializa, não aluga e não vende seus dados financeiros pessoais sob nenhuma hipótese.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>2. Base Legal do Processamento</h2>
        <p style={{ marginBottom: '1rem' }}>Conforme exigido pela Lei Geral de Proteção de Dados Pessoais (LGPD), processamos seus dados apoiados nas seguintes bases legais:</p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong>Execução de Serviço:</strong> Para garantir o funcionamento do aplicativo, cálculos de dashboards, limites e resumos que compõem a funcionalidade central do Gestorei.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>Consentimento:</strong> Coletado explicitamente para funcionalidades não-essenciais, como envios de resumos diretamente via WhatsApp.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>Legítimo Interesse Operacional:</strong> Utilizado para análises internas anônimas, auditoria e prevenção contra fraudes no sistema.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>3. Dados Coletados</h2>
        <p style={{ marginBottom: '1rem' }}>Coletamos apenas os dados necessários para o funcionamento e auditoria do sistema:</p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li><strong>Dados Pessoais:</strong> Nome, E-mail, Telefone (caso consentido para WhatsApp).</li>
          <li><strong>Dados Financeiros:</strong> Transações, valores, origens/destinos e orçamentos inseridos na plataforma.</li>
          <li><strong>Dados Comportamentais e Técnicos:</strong> Hash do Endereço IP (para registro de assinatura LGPD sem excesso de rastreio), timestamps e logs de erro essenciais.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>4. Compartilhamento</h2>
        <p style={{ marginBottom: '1rem' }}>Compartilhamos dados de forma restrita apenas com os parceiros de infraestrutura necessários (ex: Supabase para banco de dados, Vercel para hospedagem) com o estrito propósito de prover o serviço. Nenhuma API externa acessa sua conta livremente.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>5. Retenção e Anonimização</h2>
        <p style={{ marginBottom: '1rem' }}>Os dados serão retidos ativamente enquanto sua conta existir. Caso você solicite a exclusão da sua conta, o Gestorei utilizará técnicas de <strong>Anonimização</strong> ou Soft Delete. Seu e-mail e dados pessoais identificáveis são destruídos criptograficamente, mantendo apenas fragmentos puramente relacionais soltos no banco para finalidades estritas de auditoria histórica operacional e prevenção contra fraudes contábeis. Esses fragmentos não poderão mais ser ligados à sua identidade.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>6. Seus Direitos</h2>
        <p style={{ marginBottom: '1rem' }}>Na Central de Dados, você pode:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Acessar, alterar ou corrigir suas informações.</li>
          <li>Revogar consentimentos concedidos (ex: WhatsApp).</li>
          <li>Exportar os seus dados brutos (Feature em desenvolvimento).</li>
          <li>Solicitar a deleção completa da identidade da sua conta.</li>
        </ul>
      </section>
    </div>
  )
}
