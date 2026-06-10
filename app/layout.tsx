import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/shared/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'Gestorei — Controle Financeiro Pessoal e Empresarial',
  description: 'Seu copiloto financeiro inteligente. Conecte contas, automatize métricas e tome decisões com base em dados reais.',
  keywords: ['finanças', 'controle financeiro', 'gestão financeira', 'fintech', 'orçamento'],
  authors: [{ name: 'Gestorei' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gestorei',
  },
  manifest: '/manifest.json',
  themeColor: '#090d16',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
