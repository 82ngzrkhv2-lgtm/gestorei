# 📦 Arquivo: Feature WhatsApp via Evolution API

## Status
**Arquivado** — não deletado. Pronto para ser reativado.

## Por que foi arquivado?

A integração com a Evolution API foi implementada e testada, mas encontrou uma limitação técnica:
> Não é possível enviar mensagens para o **mesmo número** conectado como instância na Evolution API.

Para reativar, é necessário um **número secundário dedicado** (ex: um chip de operadora diferente, apenas para envio de notificações).

## Como reativar

1. Provisionar um número secundário e conectar uma nova instância no Evolution API.
2. Copiar os arquivos desta pasta de volta para seus destinos originais:
   - `whatsapp-service.ts` → `lib/whatsapp-service.ts`
   - `whatsapp-parser.ts` → `lib/whatsapp-parser.ts`
   - `route-send-daily.ts` → `app/api/summaries/send-daily/route.ts`
   - `route-send-weekly.ts` → `app/api/summaries/send-weekly/route.ts`
   - `route-send-monthly.ts` → `app/api/summaries/send-monthly/route.ts`
3. Configurar as variáveis de ambiente:
   - `EVOLUTION_API_URL`
   - `EVOLUTION_API_KEY`
   - `EVOLUTION_INSTANCE`
4. Restaurar o campo `whatsapp_number` na UI de Settings.
5. Reativar os cron jobs para chamar `sendWhatsAppMessage` ao invés de salvar em `user_summaries`.

## Arquivos nesta pasta

| Arquivo | Destino original |
|---|---|
| `whatsapp-service.ts` | `lib/whatsapp-service.ts` |
| `whatsapp-parser.ts` | `lib/whatsapp-parser.ts` |
| `route-send-daily.ts` | `app/api/summaries/send-daily/route.ts` |
| `route-send-weekly.ts` | `app/api/summaries/send-weekly/route.ts` |
| `route-send-monthly.ts` | `app/api/summaries/send-monthly/route.ts` |

## Data do arquivamento
Junho de 2026
