-- ============================================================
-- Migration: lgpd_foundation
-- Infrastructure for Legal Agreements, GDPR/LGPD Compliance, 
-- and Safe Account Anonymization (Soft Delete)
-- ============================================================

-- 1. Tabela de Versionamento Jurídico Dinâmico
CREATE TABLE IF NOT EXISTS public.legal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Garantir que exista apenas uma versão ativa por vez (Opcional, mas seguro)
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_versions_active ON public.legal_versions (is_active) WHERE is_active = true;

-- Inserir a versão base 1.0 se a tabela estiver vazia
INSERT INTO public.legal_versions (terms_version, privacy_version, is_active)
SELECT '1.0', '1.0', true
WHERE NOT EXISTS (SELECT 1 FROM public.legal_versions);

-- Habilitar RLS
ALTER TABLE public.legal_versions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler apenas a versão ativa
DROP POLICY IF EXISTS "Anyone can read active legal version" ON public.legal_versions;
CREATE POLICY "Anyone can read active legal version"
  ON public.legal_versions
  FOR SELECT
  USING (is_active = true);


-- 2. Tabela de Consentimentos do Usuário
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  whatsapp_consent boolean NOT NULL DEFAULT false,
  ip_hash text NOT NULL, -- SHA-256 do IP por LGPD (Minimização)
  accepted_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, -- Soft delete flag
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_consent" ON public.user_consents;
CREATE POLICY "user_read_own_consent"
  ON public.user_consents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_update_own_consent" ON public.user_consents;
CREATE POLICY "user_update_own_consent"
  ON public.user_consents
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- O Insert é feito pela rota API Server-Side, logo o Service Role precisa ter acesso.
DROP POLICY IF EXISTS "service_role_all_consents" ON public.user_consents;
CREATE POLICY "service_role_all_consents"
  ON public.user_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. Função RPC Segura para Soft Delete & Anonimização
CREATE OR REPLACE FUNCTION public.soft_delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- A. Marcar como deletado na tabela de consentimentos e perfis públicos
  UPDATE public.user_consents 
  SET deleted_at = now() 
  WHERE user_id = v_uid;

  -- B. Anonimização pesada no auth.users (Tabela raiz de autenticação do Supabase)
  -- Faz o scramble do e-mail, apaga o metadata pessoal, desabilita a senha.
  -- Usamos o service context (SECURITY DEFINER permite isso em esquemas protegidos como auth).
  UPDATE auth.users 
  SET email = v_uid::text || '@deleted.gestorei.com',
      encrypted_password = 'DELETED',
      raw_user_meta_data = '{"name": "Anonimizado", "deleted": true}'::jsonb
  WHERE id = v_uid;

  -- Se tivermos tabelas de perfil público com nomes visíveis, anonimizar aqui também.
  -- UPDATE public.users_profile SET name = 'Anonimizado' WHERE id = v_uid;

END;
$$;
