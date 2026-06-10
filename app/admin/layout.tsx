import { redirect } from 'next/navigation'
import { validateAdminRequest, UnauthorizedException } from '@/lib/server/admin-auth'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await validateAdminRequest()
  } catch (err) {
    if (err instanceof UnauthorizedException) {
      redirect('/dashboard')
    }
    redirect('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Admin header */}
      <header style={{
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--bg-card)',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem' }}>🛡️</span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Central Administrativa</span>
          <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '0.125rem 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            ADMIN
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
          <Link href="/dashboard" style={{ padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            ← Voltar ao App
          </Link>
        </nav>
      </header>
      <main style={{ padding: '2rem', maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
