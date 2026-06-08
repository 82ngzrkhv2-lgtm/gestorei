import React from 'react'

interface Props {
  label: string
  value: string
  icon: React.ReactNode
  color?: string
  bgColor?: string
  trend?: 'up' | 'down'
  subtitle?: string
  className?: string
  /** Override font size for the value. Defaults to var(--text-money-md) */
  valueSize?: 'sm' | 'md' | 'lg'
}

const VALUE_SIZE_MAP = {
  sm: 'var(--text-money-sm)',
  md: 'var(--text-money-md)',
  lg: 'var(--text-money-lg)',
}

const StatsCard = React.memo(function StatsCard({
  label,
  value,
  icon,
  color = 'var(--accent)',
  bgColor,
  trend,
  subtitle,
  className = '',
  valueSize = 'md',
}: Props) {
  const valueFontSize = VALUE_SIZE_MAP[valueSize]

  return (
    <div
      className={`stat-card ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Background glow — decorative only */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -24,
          right: -24,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: bgColor ?? color,
          opacity: 0.07,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header row: label + icon */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '0.875rem',
        gap: '0.5rem',
      }}>
        <span
          className="stat-label"
          style={{
            /* Ensure label never overlaps icon */
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>

        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bgColor ?? `${color}15`,
          border: `1px solid ${color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      {/* Value row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.375rem',
        minWidth: 0,
        overflow: 'hidden',
      }}>
        {/*
          Financial value:
          - tabular-nums: numbers align properly
          - whitespace nowrap: never breaks mid-number
          - overflow hidden + ellipsis: graceful truncation
          - clamp font-size: scales with viewport
        */}
        <span
          className="stat-value money-value"
          style={{
            color,
            fontSize: valueFontSize,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
          }}
          title={value}  /* Show full value in tooltip if truncated */
        >
          {value}
        </span>

        {trend && (
          <span style={{
            marginBottom: 4,
            color: trend === 'up' ? 'var(--accent)' : 'var(--accent-red)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            background: trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '2px 6px',
            borderRadius: 99,
            flexShrink: 0,
            lineHeight: 1.5,
          }}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {subtitle && (
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          marginTop: '0.375rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
})

export default StatsCard
