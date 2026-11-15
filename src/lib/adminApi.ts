import { supabase } from './supabase'
import type { OrderRow } from './ordersApi'

// 어드민 — 관리자 판별은 서버(is_admin RPC, 이메일 허용 목록). 상태 변경도 전부 서버 RPC.
export async function adminSignIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return Boolean(data)
}

export async function adminListOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

export async function adminConfirmDeposit(orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_confirm_deposit', { p_order_id: orderId })
  if (error) throw error
  return data as OrderRow
}

export async function adminCancelOrder(orderId: string, memo?: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_cancel_order', { p_order_id: orderId, p_memo: memo ?? null })
  if (error) throw error
  return data as OrderRow
}
