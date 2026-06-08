-- ============================================================
-- Migration: user_summary_settings
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_summary_settings (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number         text        NOT NULL DEFAULT '',
  daily_summary_enabled   boolean     NOT NULL DEFAULT true,
  weekly_summary_enabled  boolean     NOT NULL DEFAULT true,
  monthly_summary_enabled boolean     NOT NULL DEFAULT true,
  -- Hour (0-23) in BRT when the daily summary is sent
  daily_send_hour         integer     NOT NULL DEFAULT 20,
  -- 0=Sunday, 5=Friday, 6=Saturday
  weekly_send_day         integer     NOT NULL DEFAULT 6,
  -- 1=first day of next month, 0=last day of current month
  monthly_send_day        integer     NOT NULL DEFAULT 1,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

-- Row-Level Security
ALTER TABLE public.user_summary_settings ENABLE ROW LEVEL SECURITY;

-- Policy: user can only read/write their own settings
DROP POLICY IF EXISTS "owner_all" ON public.user_summary_settings;
CREATE POLICY "owner_all"
  ON public.user_summary_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_summary_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_summary_settings_updated_at ON public.user_summary_settings;
CREATE TRIGGER set_summary_settings_updated_at
  BEFORE UPDATE ON public.user_summary_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_summary_settings_updated_at();
