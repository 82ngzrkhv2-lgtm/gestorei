export interface ParsedTransaction {
  type: 'income' | 'expense'
  amount: number
  accountHint: string
  parsed: boolean
  rawMessage: string
  error?: string
}

/**
 * Parses WhatsApp-style structured messages into transactions.
 *
 * Supported formats:
 *   #saida 320 facebookads
 *   #entrada 1200 cliente
 *   #saida 89 canva Software
 */
export function parseWhatsappMessage(message: string): ParsedTransaction {
  const trimmed = message.trim().toLowerCase()

  // Match: #saida|#entrada <amount> <account> [optional description]
  const regex = /^#(saida|entrada|saída)\s+([\d.,]+)\s+(\S+)(?:\s+(.+))?$/i
  const match = trimmed.match(regex)

  if (!match) {
    return {
      type: 'expense',
      amount: 0,
      accountHint: '',
      parsed: false,
      rawMessage: message,
      error: 'Formato inválido. Use: #saida 320 facebookads ou #entrada 1200 cliente',
    }
  }

  const [, directive, amountStr, accountHint] = match
  const amount = parseFloat(amountStr.replace(',', '.'))

  if (isNaN(amount) || amount <= 0) {
    return {
      type: 'expense',
      amount: 0,
      accountHint,
      parsed: false,
      rawMessage: message,
      error: 'Valor inválido.',
    }
  }

  const type = directive.replace('í', 'i') === 'saida' ? 'expense' : 'income'

  return {
    type,
    amount,
    accountHint: normalizeAccountHint(accountHint),
    parsed: true,
    rawMessage: message,
  }
}

function normalizeAccountHint(raw: string): string {
  const map: Record<string, string> = {
    facebookads: 'Facebook Ads',
    facebook: 'Facebook Ads',
    fb: 'Facebook Ads',
    googleads: 'Google Ads',
    google: 'Google Ads',
    pessoal: 'Pessoal',
    personal: 'Pessoal',
    empresa: 'Empresa',
    business: 'Empresa',
    reservas: 'Reservas',
    reserve: 'Reservas',
    saas: 'SaaS',
    investimentos: 'Investimentos',
    invest: 'Investimentos',
    agencia: 'Agência',
    agency: 'Agência',
    cartao: 'Cartão',
    card: 'Cartão',
  }
  return map[raw.toLowerCase()] ?? raw
}
