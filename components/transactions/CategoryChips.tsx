'use client'

import { useRef, useEffect } from 'react'
import type { Category } from '@/types/database'

interface CategoryChipsProps {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export default function CategoryChips({ categories, selectedId, onSelect, disabled }: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Opcional: Efeito de rolar com o mouse ou suavidade
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let isDown = false
    let startX: number
    let scrollLeft: number

    const onMouseDown = (e: MouseEvent) => {
      isDown = true
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
    }
    const onMouseLeave = () => { isDown = false }
    const onMouseUp = () => { isDown = false }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      const walk = (x - startX) * 2
      el.scrollLeft = scrollLeft - walk
    }

    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mousemove', onMouseMove)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500, paddingLeft: '0.25rem' }}>
        Categoria <span style={{ opacity: 0.6, fontWeight: 400 }}>(Opcional)</span>
      </p>
      
      <div 
        ref={scrollRef}
        style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          paddingBottom: '0.75rem', 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE/Edge
        }}
        className="hide-scrollbar"
      >
        <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar { display: none; }` }} />
        
        {categories.map(c => {
          const isSelected = selectedId === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(isSelected ? '' : c.id)}
              disabled={disabled}
              style={{
                flexShrink: 0,
                display: 'inline-flex', 
                alignItems: 'center',
                padding: '0.5rem 1rem', 
                borderRadius: '999px',
                background: isSelected ? 'var(--text-primary)' : 'var(--bg-elevated)',
                color: isSelected ? 'var(--bg-card)' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '0.8125rem', 
                fontWeight: 500, 
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease-out',
                opacity: disabled ? 0.5 : 1
              }}
            >
              {c.name}
            </button>
          )
        })}
        
        {/* Nova categoria (secundária/discreta) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => alert('Criar nova categoria (em breve)')}
          style={{
            flexShrink: 0,
            display: 'inline-flex', 
            alignItems: 'center',
            padding: '0.5rem 1rem', 
            borderRadius: '999px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
            fontSize: '0.8125rem', 
            fontWeight: 500, 
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            opacity: disabled ? 0.5 : 1
          }}
        >
          + Nova
        </button>
      </div>
    </div>
  )
}
