import Logo from '@/components/shared/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <Logo size={48} />
          <span className="auth-logo-text">Gestorei</span>
        </div>

        {/* Formulário Injetado */}
        <div className="auth-form-container">
          {children}
        </div>
      </div>

      <style>{`
        .auth-layout {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base); /* Fundo off-white */
          padding: 1.5rem;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-card); /* Card branco limpo */
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          margin-bottom: 2.5rem;
        }

        .auth-logo-icon {
          width: 36px;
          height: 36px;
          background: var(--text-primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bg-card);
        }

        .auth-logo-text {
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.04em;
          color: var(--text-primary);
        }

        .auth-form-container {
          width: 100%;
        }

        @media (max-width: 640px) {
          .auth-card {
            padding: 2rem 1.5rem;
            border-radius: 20px;
            border: none;
            box-shadow: none;
            background: transparent;
          }
          .auth-layout {
            align-items: flex-start;
            padding-top: 4rem;
            background: var(--bg-base);
          }
        }
      `}</style>
    </div>
  )
}
