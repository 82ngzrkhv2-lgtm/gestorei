export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateStr + 'T00:00:00'))
}

export function formatDateFull(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'))
}

export function getMonthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function getPreviousMonthStart(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function getMonthEnd(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    personal: 'Pessoal',
    business: 'Empresa',
    ads: 'Anúncios',
    investment: 'Investimento',
    card: 'Cartão',
    reserve: 'Reserva',
    agency: 'Agência',
    other: 'Outro',
  }
  return labels[type] ?? type
}
