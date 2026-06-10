/**
 * lib/server/admin-auth.ts
 *
 * Centralized admin authorization helper.
 * Service Role is ONLY instantiated here — never spread across routes.
 */
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export class UnauthorizedException extends Error {
  constructor(message = 'Acesso não autorizado') {
    super(message)
    this.name = 'UnauthorizedException'
  }
}

export type AdminRole = 'admin' | 'super_admin'

interface AdminSession {
  userId: string
  role: AdminRole
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('[admin-auth] Missing Supabase service role credentials')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Validates that the requester is an authenticated admin or super_admin.
 * Throws UnauthorizedException if not.
 */
export async function validateAdminRequest(_req?: NextRequest): Promise<AdminSession> {
  // 1. Get the authenticated user from the session cookie
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedException('Sessão inválida')
  }

  // 2. Check role via service client (bypasses RLS to read user_roles safely)
  const admin = getAdminSupabase()
  const { data: roleRow, error: roleError } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleError || !roleRow) {
    throw new UnauthorizedException('Permissões não encontradas')
  }

  if (roleRow.role !== 'admin' && roleRow.role !== 'super_admin') {
    throw new UnauthorizedException('Acesso restrito a administradores')
  }

  return { userId: user.id, role: roleRow.role as AdminRole }
}

/**
 * Returns the admin Supabase client for use in server-side admin operations.
 * Always validate the session first with validateAdminRequest().
 */
export function getAdminClient() {
  return getAdminSupabase()
}

/**
 * Logs an admin action to admin_audit_logs.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string | null,
  payload: Record<string, unknown> = {}
) {
  const admin = getAdminSupabase()
  await admin.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_user_id: targetUserId,
    payload,
  })
}
