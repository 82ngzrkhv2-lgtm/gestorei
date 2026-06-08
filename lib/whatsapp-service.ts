/**
 * WhatsApp Service
 *
 * Sends messages via Evolution API.
 * Env vars required:
 *   EVOLUTION_API_URL      — base URL of your Evolution API instance
 *   EVOLUTION_API_KEY      — global API key
 *   EVOLUTION_INSTANCE     — instance name configured in Evolution
 */

export interface SendResult {
  success: boolean
  to: string
  error?: string
}

/**
 * Normalises a Brazilian phone number to the format expected by Evolution API.
 * Input: +55 11 99999-9999 | 11999999999 | 5511999999999
 * Output: 5511999999999
 */
export function normalizePhoneNumber(raw: string): string {
  // Strip everything but digits
  const digits = raw.replace(/\D/g, '')

  // Already has country code
  if (digits.startsWith('55') && digits.length >= 12) return digits

  // Add Brazil country code
  return `55${digits}`
}

/**
 * Sends a WhatsApp text message through Evolution API.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<SendResult> {
  const baseUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!baseUrl || !apiKey || !instance) {
    console.error('[WhatsApp Service] Missing env vars: EVOLUTION_API_URL, EVOLUTION_API_KEY or EVOLUTION_INSTANCE')
    return { success: false, to, error: 'WhatsApp service not configured.' }
  }

  const phone = normalizePhoneNumber(to)
  const url = `${baseUrl}/message/sendText/${instance}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[WhatsApp Service] HTTP ${res.status}: ${body}`)
      return { success: false, to: phone, error: `HTTP ${res.status}` }
    }

    return { success: true, to: phone }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[WhatsApp Service] Fetch error: ${message}`)
    return { success: false, to: phone, error: message }
  }
}
