-- ============================================================
-- Migration: user_events (Analytics Interno)
-- Fase 3: Rastreamento real de retenção e hábito
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes para consultas rápidas no painel admin (ex: retenção D1/D7)
CREATE INDEX IF NOT EXISTS idx_user_events_user_type ON public.user_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at);

-- Habilitar RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Usuário pode inserir seus próprios eventos
DROP POLICY IF EXISTS "Users can insert own events" ON public.user_events;
CREATE POLICY "Users can insert own events"
  ON public.user_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Usuários NÃO podem ler eventos (nem os próprios), apenas admin via Service Role ou funções RPC
-- Garantir que as leituras sejam estritamente bloqueadas no front.

-- ==========================================================
-- Função auxiliar para o Painel Admin (KPIs agregados)
-- ==========================================================
-- Como o Admin precisa de ativos D1, D7, total usuários, etc.
-- O service_role no backend fará queries diretas. 
