'use client'

import { useState } from 'react'
import QuickAddModal from '@/components/transactions/QuickAddModal'

export default function FloatingAddButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        id="fab-add-transaction"
        className="fab"
        onClick={() => setOpen(true)}
        title="Adicionar movimentação"
        style={{ display: 'none' }}
        aria-label="Adicionar movimentação"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {open && <QuickAddModal onClose={() => setOpen(false)} onSuccess={() => { setOpen(false); window.location.reload(); }} />}

      <style>{`
        @media (max-width: 768px) {
          #fab-add-transaction { display: flex !important; }
        }
      `}</style>
    </>
  )
}
