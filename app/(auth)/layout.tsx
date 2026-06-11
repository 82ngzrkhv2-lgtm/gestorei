import Logo from '@/components/shared/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      {/* ── Lado Esquerdo: Marketing (Oculto em telas pequenas) ── */}
      <div className="auth-left">
        <div className="auth-left-bg" />
        
        {/* Marquee */}
        <div className="marquee-container">
          <div className="marquee-content">
            <span>🚀 Preço de lançamento</span>
            <span>•</span>
            <span>14 dias grátis</span>
            <span>•</span>
            <span>Sem cartão</span>
            <span>•</span>
            <span>Cancele com 1 clique</span>
            <span>•</span>
            <span>100% focado no seu lucro</span>
            <span>•</span>
            <span>🚀 Preço de lançamento</span>
            <span>•</span>
            <span>14 dias grátis</span>
          </div>
        </div>

        <div className="auth-left-content">
          <div className="auth-logo" style={{ marginBottom: '3rem' }}>
            <Logo size={48} />
            <span className="auth-logo-text" style={{ fontSize: '1.75rem' }}>Gestorei</span>
          </div>

          <h1 className="auth-h1">
            Pare de perder dinheiro no escuro.
          </h1>
          <p className="auth-subtitle">
            Cada semana sem controle financeiro automatizado custa até <b>R$ 1.200 em vazamentos invisíveis</b> e <b>5 horas perdidas</b> em planilhas que não fecham.
          </p>

          {/* Social Proof Chips */}
          <div className="auth-chips">
            <div className="chip">
              <span className="chip-icon">⚡</span>
              Até 8h/semana salvas
            </div>
            <div className="chip">
              <span className="chip-icon">💰</span>
              Lucro invisível recuperado
            </div>
            <div className="chip">
              <span className="chip-icon">📈</span>
              Fluxo de caixa no automático
            </div>
          </div>
        </div>
      </div>

      {/* ── Lado Direito: Formulário (100% no mobile) ── */}
      <div className="auth-right">
        {/* Mobile Header (só aparece no mobile) */}
        <div className="auth-mobile-header">
          <div className="auth-logo">
            <Logo size={32} />
            <span className="auth-logo-text">Gestorei</span>
          </div>
        </div>

        <div className="auth-form-container">
          {children}
        </div>
      </div>

      <style>{`
        /* ── Layout Principal ── */
        .auth-layout {
          min-height: 100dvh;
          display: flex;
          background: var(--bg-base);
        }

        /* ── Lado Esquerdo ── */
        .auth-left {
          display: none;
          flex: 1;
          position: relative;
          background: #050810;
          overflow: hidden;
          padding: 4rem;
          flex-direction: column;
        }

        @media (min-width: 1024px) {
          .auth-left {
            display: flex;
          }
        }

        .auth-left-bg {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
          z-index: 0;
        }

        /* Marquee */
        .marquee-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(16, 185, 129, 0.1);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          overflow: hidden;
          padding: 0.5rem 0;
          z-index: 10;
        }
        .marquee-content {
          display: flex;
          gap: 2rem;
          white-space: nowrap;
          animation: marquee 20s linear infinite;
          color: var(--accent);
          font-weight: 600;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .auth-left-content {
          position: relative;
          z-index: 1;
          max-width: 520px;
          margin-top: auto;
          margin-bottom: auto;
        }

        .auth-h1 {
          font-size: 3rem;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #fff;
          margin-bottom: 1.5rem;
        }

        .auth-subtitle {
          font-size: 1.125rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin-bottom: 3rem;
        }
        .auth-subtitle b {
          color: #fff;
        }

        /* Chips */
        .auth-chips {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1rem 1.5rem;
          border-radius: 16px;
          font-weight: 600;
          color: #fff;
          width: fit-content;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .chip-icon {
          font-size: 1.25rem;
        }

        /* ── Lado Direito ── */
        .auth-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          background: var(--bg-base);
          border-left: 1px solid var(--glass-border);
        }
        
        @media (min-width: 1024px) {
          .auth-right {
            flex: 0 0 500px;
          }
        }

        .auth-mobile-header {
          padding: 1.5rem;
          display: flex;
          justify-content: center;
          border-bottom: 1px solid var(--glass-border);
          background: var(--bg-elevated);
        }
        @media (min-width: 1024px) {
          .auth-mobile-header {
            display: none;
          }
        }

        .auth-form-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
        }

        /* ── Componentes Compartilhados ── */
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .auth-logo-icon {
          width: 48px;
          height: 48px;
          background: var(--accent);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
        }
        .auth-logo-text {
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #fff;
        }
      `}</style>
    </div>
  )
}
