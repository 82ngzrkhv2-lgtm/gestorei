-- ============================================================
-- Migration: notifications_system
-- Motor de Notificações + Central Administrativa
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'daily_ready', 'weekly_ready', 'monthly_ready',
    'limit_alert', 'goal_milestone', 'spending_spike', 'income_above_avg'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('push', 'inbox_only');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE admin_action AS ENUM (
    'suspend', 'activate', 'block', 'grant_trial',
    'revoke_access', 'alter_role', 'promote_admin'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE health_status AS ENUM ('ok', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. PROFILES (Espelho de auth.users — usado pelo Admin)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text,
  email         text,
  status        user_status NOT NULL DEFAULT 'active',
  last_sign_in_at  timestamptz,
  last_activity_at timestamptz, -- Atualizado por trigger em transactions/accounts
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;
CREATE POLICY "profiles_service_all" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger: criar profile ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: atualizar last_activity_at ao inserir transação
CREATE OR REPLACE FUNCTION public.update_last_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transaction_activity ON public.transactions;
CREATE TRIGGER on_transaction_activity
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_last_activity();

-- ─────────────────────────────────────────────────────────────
-- 3. USER ROLES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_own_read" ON public.user_roles;
CREATE POLICY "user_roles_own_read" ON public.user_roles
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_roles_service_all" ON public.user_roles;
CREATE POLICY "user_roles_service_all" ON public.user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger: criar role padrão ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_role ON auth.users;
CREATE TRIGGER on_auth_user_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ─────────────────────────────────────────────────────────────
-- 4. NOTIFICATIONS (Eventos pontuais — inbox e delivery)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  payload    jsonb DEFAULT '{}',
  priority   notification_priority NOT NULL DEFAULT 'inbox_only',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_service_all" ON public.notifications;
CREATE POLICY "notifications_service_all" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 5. NOTIFICATION_COOLDOWNS (Anti-spam)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_cooldowns (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  last_fired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_type)
);

ALTER TABLE public.notification_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cooldowns_service_all" ON public.notification_cooldowns;
CREATE POLICY "cooldowns_service_all" ON public.notification_cooldowns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 6. NOTIFICATION_PREFERENCES (Substitui user_summary_settings)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_summary_enabled    boolean NOT NULL DEFAULT true,
  weekly_summary_enabled   boolean NOT NULL DEFAULT true,
  monthly_summary_enabled  boolean NOT NULL DEFAULT true,
  push_enabled             boolean NOT NULL DEFAULT false,
  preferred_daily_time     int NOT NULL DEFAULT 20, -- hora UTC
  preferred_weekday        int NOT NULL DEFAULT 6,  -- 6 = Sábado
  preferred_monthly_day    int NOT NULL DEFAULT 1,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Migrar dados existentes de user_summary_settings
INSERT INTO public.notification_preferences (
  user_id, daily_summary_enabled, weekly_summary_enabled,
  monthly_summary_enabled, preferred_daily_time,
  preferred_weekday, preferred_monthly_day
)
SELECT
  user_id, daily_summary_enabled, weekly_summary_enabled,
  monthly_summary_enabled,
  COALESCE(daily_send_hour, 20),
  COALESCE(weekly_send_day, 6),
  COALESCE(monthly_send_day, 1)
FROM public.user_summary_settings
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_select" ON public.notification_preferences;
CREATE POLICY "notif_prefs_select" ON public.notification_preferences
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notif_prefs_upsert" ON public.notification_preferences;
CREATE POLICY "notif_prefs_upsert" ON public.notification_preferences
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 7. PUSH_SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_json jsonb NOT NULL, -- JSON completo da PushSubscription (future-proof)
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_used_at      timestamptz
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_own" ON public.push_subscriptions
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "push_subs_service" ON public.push_subscriptions;
CREATE POLICY "push_subs_service" ON public.push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 8. SYSTEM_HEALTH_LOGS (Health check real dos cron jobs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name      text NOT NULL,
  status        health_status NOT NULL,
  duration_ms   int,
  records_processed int DEFAULT 0,
  error_message text,
  executed_at   timestamptz NOT NULL DEFAULT now()
);

-- Manter apenas os últimos 90 dias (limpeza via cron futuro)
CREATE INDEX IF NOT EXISTS idx_health_logs_job_date
  ON public.system_health_logs (job_name, executed_at DESC);

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_logs_service_all" ON public.system_health_logs;
CREATE POLICY "health_logs_service_all" ON public.system_health_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 9. ADMIN_AUDIT_LOGS (Auditoria de ações administrativas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid NOT NULL REFERENCES auth.users(id),
  action         admin_action NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  payload        jsonb DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
  -- Append-only: sem UPDATE/DELETE permitido
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_service_all" ON public.admin_audit_logs;
CREATE POLICY "audit_logs_service_all" ON public.admin_audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
