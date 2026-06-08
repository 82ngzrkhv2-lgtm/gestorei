interface Props {
  label: string
  value: string
  icon: React.ReactNode
  color?: string
  bgColor?: string
  trend?: 'up' | 'down'
  subtitle?: string
  className?: string
}

export default function StatsCard({
  label, value, icon, color = 'var(--accent)',
  bgColor, trend, subtitle, className = ''
}: Props) {
  return (
    <div className={`stat-card ${className}`} style={{
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -24, right: -24,
        width: 80, height: 80, borderRadius: '50%',
        background: bgColor ?? color,
        opacity: 0.07, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="stat-label">{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: bgColor ?? `${color}15`,
          border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
        <span className="stat-value" style={{ color }}>{value}</span>
        {trend && (
          <span style={{
            marginBottom: 6,
            color: trend === 'up' ? 'var(--accent)' : 'var(--accent-red)',
            fontSize: '0.75rem', fontWeight: 700,
            background: trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '1px 6px', borderRadius: 99,
          }}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {subtitle && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
