'use client'

import { useState } from 'react'
import QuickAddModal from '@/components/transactions/QuickAddModal'

export default function DesktopAddButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="btn btn-primary" 
        style={{ width: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '12px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Movimentação
      </button>

      {open && (
        <QuickAddModal 
          onClose={() => setOpen(false)} 
          onSuccess={() => { setOpen(false); window.location.reload() }} 
        />
      )}
    </>
  )
}
