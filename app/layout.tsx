import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinCockpit — Controle Financeiro Pessoal e Empresarial',
  description: 'Cockpit financeiro inteligente para você ter clareza, separação e controle total do seu dinheiro pessoal e empresarial.',
  keywords: ['finanças', 'controle financeiro', 'gestão financeira', 'fintech', 'orçamento'],
  authors: [{ name: 'FinCockpit' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
