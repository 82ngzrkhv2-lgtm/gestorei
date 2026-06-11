import Logo from '@/components/shared/Logo'

export default function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg-base)' }}>
      <Logo size={56} />
    </div>
  )
}
