-- ============================================================
-- Migration: security_rls_policies
-- FASE 2 Correções - RLS Strict & Constraints
-- ============================================================

-- 1. ADICIONAR VALIDAÇÃO EM NÍVEL DE BANCO (CHECK CONSTRAINTS)
-- Como o frontend insere dados diretamente via client SDK, o banco deve impedir absurdos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transactions') THEN
    -- Garante que valores numéricos são sempre positivos na inserção base
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_check CHECK (amount >= 0);
    -- Garante tipos válidos
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. HABILTAR RLS
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

-- 3. DROPS GERAIS DE POLÍTICAS EXISTENTES (LIMPANDO O FOR ALL MASCARADO)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('user_summaries', 'user_summary_settings', 'subscriptions', 'accounts', 'transactions', 'categories')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 4. RECRIAÇÃO DE POLÍTICAS ESTritas: (select auth.uid()) = user_id
-- O uso de (select auth.uid()) otimiza o cache do Postgres e evita bugs conhecidos.
-- Separando em SELECT, INSERT, UPDATE, DELETE para maior granularidade.

-- ==========================================================
-- ACCOUNTS
-- ==========================================================
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT TO authenticated WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE TO authenticated USING ( (select auth.uid()) = user_id ) WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE TO authenticated USING ( (select auth.uid()) = user_id );

-- ==========================================================
-- TRANSACTIONS
-- ==========================================================
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE TO authenticated USING ( (select auth.uid()) = user_id ) WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE TO authenticated USING ( (select auth.uid()) = user_id );

-- ==========================================================
-- CATEGORIES
-- ==========================================================
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated USING ( (select auth.uid()) = user_id ) WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated USING ( (select auth.uid()) = user_id );

-- ==========================================================
-- USER_SUMMARIES
-- ==========================================================
CREATE POLICY "user_summaries_select" ON public.user_summaries FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );
CREATE POLICY "user_summaries_update" ON public.user_summaries FOR UPDATE TO authenticated USING ( (select auth.uid()) = user_id ) WITH CHECK ( (select auth.uid()) = user_id );
-- Service Role (Webhooks/Cron)
CREATE POLICY "user_summaries_service_select" ON public.user_summaries FOR SELECT TO service_role USING (true);
CREATE POLICY "user_summaries_service_insert" ON public.user_summaries FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "user_summaries_service_update" ON public.user_summaries FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ==========================================================
-- USER_SUMMARY_SETTINGS
-- ==========================================================
CREATE POLICY "settings_select" ON public.user_summary_settings FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );
CREATE POLICY "settings_insert" ON public.user_summary_settings FOR INSERT TO authenticated WITH CHECK ( (select auth.uid()) = user_id );
CREATE POLICY "settings_update" ON public.user_summary_settings FOR UPDATE TO authenticated USING ( (select auth.uid()) = user_id ) WITH CHECK ( (select auth.uid()) = user_id );

-- ==========================================================
-- SUBSCRIPTIONS
-- ==========================================================
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );
-- Service role para webhooks
CREATE POLICY "subscriptions_service_all" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
