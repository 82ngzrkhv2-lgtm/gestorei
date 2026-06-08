'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types/database'

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6b7280']

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<'income'|'expense'|'both'>('expense')
  const [color, setColor] = useState('#ef4444')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('type').order('name')
    if (data) setCategories(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditCat(null); setName(''); setType('expense'); setColor('#ef4444'); setShowModal(true) }
  function openEdit(c: Category) { setEditCat(c); setName(c.name); setType(c.type); setColor(c.color); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (editCat) {
      await supabase.from('categories').update({ name, type, color }).eq('id', editCat.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('categories').insert({ user_id: user.id, name, type, color, icon: 'tag' })
      }
    }
    setSaving(false); setShowModal(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta categoria? As transações associadas ficarão sem categoria.')) return
    await supabase.from('categories').delete().eq('id', id)
    load()
  }

  const income = categories.filter(c => c.type === 'income')
  const expense = categories.filter(c => c.type === 'expense')
  const both = categories.filter(c => c.type === 'both')

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Organize suas movimentações</p>
        </div>
        <button id="create-category-btn" className="btn btn-primary" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Categoria
        </button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius)' }} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {[{ label: 'Saídas', items: expense, badgeClass: 'badge-expense' },
            { label: 'Entradas', items: income, badgeClass: 'badge-income' },
            { label: 'Ambos', items: both, badgeClass: '' },
          ].map(({ label, items, badgeClass }) => items.length > 0 && (
            <div key={label} className="glass-card" style={{ padding: '1.25rem' }}>
              <div className="section-header">
                <span className="section-title">{label}</span>
                <span className={`badge ${badgeClass}`}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <div className="color-dot" style={{ background: c.color, width: 12, height: 12 }} />
                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{c.name}</span>
                    {c.is_default && <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 99 }}>padrão</span>}
                    <button onClick={() => openEdit(c)} className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {!c.is_default && (
                      <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-icon" style={{ width: 28, height: 28 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content animate-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{editCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label" htmlFor="cat-name">Nome</label>
                <input id="cat-name" className="input" placeholder="Ex: Marketing" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="input-label" htmlFor="cat-type">Tipo</label>
                <select id="cat-type" className="input" value={type} onChange={e => setType(e.target.value as 'income'|'expense'|'both')}>
                  <option value="expense">Saída</option>
                  <option value="income">Entrada</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div>
                <label className="input-label">Cor</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : editCat ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
