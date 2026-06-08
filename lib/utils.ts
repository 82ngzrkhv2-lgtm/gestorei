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

export type PeriodFilter = 'current_month' | 'last_month' | 'last_7_days' | 'last_30_days' | 'this_year' | 'all_time'

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  current_month: 'Este Mês',
  last_month: 'Mês Passado',
  last_7_days: 'Últimos 7 dias',
  last_30_days: 'Últimos 30 dias',
  this_year: 'Este Ano',
  all_time: 'Todo Período'
}

export function getDateRangeForPeriod(period: PeriodFilter): { start: string | null, end: string | null, label: string } {
  const today = new Date()
  
  const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  
  switch (period) {
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDateStr(start), end: formatDateStr(end), label: 'do mês passado' }
    }
    case 'last_7_days': {
      const start = new Date(today)
      start.setDate(today.getDate() - 7)
      return { start: formatDateStr(start), end: formatDateStr(today), label: 'dos últimos 7 dias' }
    }
    case 'last_30_days': {
      const start = new Date(today)
      start.setDate(today.getDate() - 30)
      return { start: formatDateStr(start), end: formatDateStr(today), label: 'dos últimos 30 dias' }
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return { start: formatDateStr(start), end: formatDateStr(end), label: 'deste ano' }
    }
    case 'all_time': {
      return { start: null, end: null, label: 'de todo o período' }
    }
    case 'current_month':
    default: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDateStr(start), end: formatDateStr(end), label: 'deste mês' }
    }
  }
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
