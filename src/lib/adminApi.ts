import { supabase } from './supabase'
import type { OrderRow, ShipmentRow } from './ordersApi'

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

// 환불 — 신청을 열어 보면 검토중으로, 이체를 마치면 완료로 (PRD §7.1·7.5)
export async function adminReviewRefund(orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_review_refund', { p_order_id: orderId })
  if (error) throw error
  return data as OrderRow
}

export async function adminCompleteRefund(orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_complete_refund', { p_order_id: orderId })
  if (error) throw error
  return data as OrderRow
}

export async function adminRejectRefund(orderId: string, memo: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_reject_refund', { p_order_id: orderId, p_memo: memo })
  if (error) throw error
  return data as OrderRow
}

// 주문 상세 부가 정보 — 분석 저장본·부적 추천/선택 (관리자 RLS로 조회, §10.2 사주 확인 상세)
export async function adminGetOrderExtras(orderId: string): Promise<{
  reading: { pages: Array<{ title: string; body: string }>; generator: string } | null
  picks: {
    element: string
    reason: string | null
    recommended: Array<{ id: string; hanja: string; korean: string; meaning: string; personal: boolean }>
    chosen_id: string | null
  } | null
}> {
  const [readingRes, picksRes] = await Promise.all([
    supabase.from('readings').select('pages, generator').eq('order_id', orderId).maybeSingle(),
    supabase.from('talisman_picks').select('element, reason, recommended, chosen_id').eq('order_id', orderId).maybeSingle(),
  ])
  return {
    reading: (readingRes.data as never) ?? null,
    picks: (picksRes.data as never) ?? null,
  }
}

// 배송 관리 (3-3·3-4) — 제작 목록·송장 입력
export async function adminListShipments(): Promise<Record<string, ShipmentRow>> {
  const { data, error } = await supabase.from('shipments').select('*')
  if (error) throw error
  return Object.fromEntries(((data ?? []) as ShipmentRow[]).map((s) => [s.order_id, s]))
}

// 배송 부적 지정 (§17.2) — 장수는 서버가 상품에 맞게 검증
export async function adminSetShippingTalismans(
  orderId: string,
  items: Array<{ hanja: string; korean: string }>,
): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_set_shipping_talismans', { p_order_id: orderId, p_items: items })
  if (error) throw error
  return data as OrderRow
}

export async function adminShip(orderId: string, carrier: string, tracking: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_ship', { p_order_id: orderId, p_carrier: carrier, p_tracking: tracking })
  if (error) throw error
  return data as OrderRow
}

export async function adminDeliver(orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_deliver', { p_order_id: orderId })
  if (error) throw error
  return data as OrderRow
}

export async function adminSetMemo(orderId: string, memo: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('admin_set_memo', { p_order_id: orderId, p_memo: memo })
  if (error) throw error
  return data as OrderRow
}
