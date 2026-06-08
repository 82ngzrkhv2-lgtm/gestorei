export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-bg">
        <div className="auth-bg-glow1" />
        <div className="auth-bg-glow2" />
      </div>
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="auth-logo-text">FinCockpit</span>
        </div>
        {children}
      </div>
      <style>{`
        .auth-layout {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
          background: var(--bg-base);
        }
        .auth-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .auth-bg-glow1 {
          position: absolute;
          top: -20%;
          left: -10%;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%);
          border-radius: 50%;
        }
        .auth-bg-glow2 {
          position: absolute;
          bottom: -20%;
          right: -10%;
          width: 40vw;
          height: 40vw;
          background: radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%);
          border-radius: 50%;
        }
        .auth-container {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 2rem;
          justify-content: center;
        }
        .auth-logo-icon {
          width: 36px;
          height: 36px;
          background: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
        }
        .auth-logo-text {
          font-size: 1.375rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}
