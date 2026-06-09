-- ============================================================
-- Migration: user_summaries
-- Tabela para armazenar resumos financeiros gerados pelos cron jobs.
-- Os resumos são exibidos como pop-up in-app ao usuário.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_summaries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Tipo do resumo: diário, semanal ou mensal
  type          text        NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  -- Label legível do período (ex: "Segunda, 09 de junho de 2026")
  period_label  text        NOT NULL DEFAULT '',
  -- Conteúdo estruturado: métricas + insights (jsonb para flexibilidade)
  content       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Quando o cron gerou este resumo
  generated_at  timestamptz NOT NULL DEFAULT now(),
  -- Quando o usuário fechou/viu o pop-up (null = ainda não leu)
  dismissed_at  timestamptz,
  -- Depois desta data o resumo não é mais exibido
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Índices para as queries do app
CREATE INDEX IF NOT EXISTS idx_user_summaries_user_unread
  ON public.user_summaries (user_id, dismissed_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_summaries_generated
  ON public.user_summaries (user_id, generated_at DESC);

-- Row-Level Security
ALTER TABLE public.user_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só lê/escreve seus próprios resumos
DROP POLICY IF EXISTS "owner_all" ON public.user_summaries;
CREATE POLICY "owner_all"
  ON public.user_summaries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: service_role (cron) pode inserir para qualquer usuário
DROP POLICY IF EXISTS "service_insert" ON public.user_summaries;
CREATE POLICY "service_insert"
  ON public.user_summaries
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_update" ON public.user_summaries;
CREATE POLICY "service_update"
  ON public.user_summaries
  FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "service_select" ON public.user_summaries;
CREATE POLICY "service_select"
  ON public.user_summaries
  FOR SELECT
  TO service_role
  USING (true);
