/**
 * Analytics Básico Interno do Gestorrei
 * Usado para medir retenção inicial (D1, D7), tempo até primeira movimentação,
 * e abandono de onboarding de forma extremamente leve e focada.
 */

type EventName = 
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_completed'
  | 'first_transaction'
  | 'transaction_added'
  | 'category_created'
  | 'nucleus_created'
  | 'app_opened'
  | 'dashboard_viewed'
  | 'fast_entry_used'

interface EventPayload {
  [key: string]: any;
}

export function trackEvent(eventName: EventName, payload?: EventPayload) {
  // Dispara em background (fire-and-forget)
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, payload }),
  }).catch((err) => {
    console.error('[ANALYTICS] Falha ao enviar evento:', err);
  });
}
