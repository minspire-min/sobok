import { supabase } from './supabase'
import type { SajuProfileRow } from './profilesApi'

// 주문 행 — 금액·상태는 전부 서버(DB 함수)가 정한다. 클라이언트는 조회·요청만.
export type OrderRow = {
  id: string
  order_code: string
  profile_id: string
  product: 1 | 2 | 3
  kind: 'new' | 'repurchase' | 'renewal'
  top_concern: string
  sub_concern: string
  concern_text: string | null
  amount: number
  cash_receipt_phone: string | null
  payment_status: 'awaiting_deposit' | 'paid' | 'refund_requested' | 'refund_reviewing' | 'refunded' | 'canceled'
  deposit_due_at: string
  deposit_reported_at: string | null
  paid_at: string | null
  reading_first_viewed_at: string | null // 분석 최초 열람 — 환불 가능 여부·차액 계산 기준(결정 #4·§17.3)
  saju_snapshot: SajuProfileRow // 주문 시점의 사주 입력값 — 부적 추천 계산 기준
  refund_reason: string | null
  refund_account: { bank: string; account: string; holder: string } | null
  refunded_at: string | null
  admin_memo: string | null
  shipping_status: ShippingStatus | null // 결제2·3만, 결제1은 null
  shipping_talismans: Array<{ hanja: string; korean: string }> | null // 지민 지정 배송 부적(§17.2)
  claim_reason: string | null // 교환·반품 사유
  refund_amount: number | null // 반품 환불 예정액(서버 계산, §17.3 차액 규칙)
  created_at: string
}

export type ShippingStatus =
  | 'awaiting'
  | 'shipping'
  | 'delivered'
  | 'exchange_requested'
  | 'exchange_shipping'
  | 'exchange_done'
  | 'return_requested'
  | 'return_shipping'
  | 'return_done'

export const SHIPPING_STATUS_LABEL: Record<ShippingStatus, string> = {
  awaiting: '배송 대기',
  shipping: '배송중',
  delivered: '배송 완료',
  exchange_requested: '교환 신청',
  exchange_shipping: '교환 배송중',
  exchange_done: '교환 완료',
  return_requested: '반품 신청',
  return_shipping: '반품 배송중',
  return_done: '반품 완료',
}

export type ShipmentRow = {
  order_id: string
  receiver: string
  phone: string
  postcode: string
  address: string
  address_detail: string | null
  memo: string | null
  carrier: string | null
  tracking_no: string | null
  shipped_at: string | null
  delivered_at: string | null
}

// 교환·반품 (3-5) — 배송 완료 후 7일 내(서버 검증, 전자상거래법 청약철회 기준)
export async function requestExchange(orderId: string, reason: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('request_exchange', { p_order_id: orderId, p_reason: reason })
  if (error) throw error
  return data as OrderRow
}

export async function requestReturn(params: {
  orderId: string
  reason: string
  bank: string
  account: string
  holder: string
}): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('request_return', {
    p_order_id: params.orderId,
    p_reason: params.reason,
    p_bank: params.bank,
    p_account: params.account,
    p_holder: params.holder,
  })
  if (error) throw error
  return data as OrderRow
}

export async function getShipment(orderId: string): Promise<ShipmentRow | null> {
  const { data, error } = await supabase.from('shipments').select('*').eq('order_id', orderId).maybeSingle()
  if (error) throw error
  return (data as ShipmentRow) ?? null
}

// 배송지 입력·수정 — 결제 완료 + 발송 전까지 (§6.5)
export async function upsertShippingAddress(params: {
  orderId: string
  receiver: string
  phone: string
  postcode: string
  address: string
  addressDetail?: string
  memo?: string
}): Promise<ShipmentRow> {
  const { data, error } = await supabase.rpc('upsert_shipping_address', {
    p_order_id: params.orderId,
    p_receiver: params.receiver,
    p_phone: params.phone,
    p_postcode: params.postcode,
    p_address: params.address,
    p_address_detail: params.addressDetail ?? null,
    p_memo: params.memo ?? null,
  })
  if (error) throw error
  return data as ShipmentRow
}

export const PAYMENT_STATUS_LABEL: Record<OrderRow['payment_status'], string> = {
  awaiting_deposit: '입금 대기',
  paid: '결제 완료',
  refund_requested: '환불 신청',
  refund_reviewing: '환불 검토중',
  refunded: '환불 완료',
  canceled: '주문 취소',
}

// 상태 배지 색 — §9.1: 새 색을 만들지 않고 기존 토큰 재사용 (진행/완료/주의/종료)
export const PAYMENT_STATUS_COLOR: Record<OrderRow['payment_status'], string> = {
  awaiting_deposit: 'border-[#f31bc0] text-[#f31bc0]',
  paid: 'border-[#17c666] text-[#17c666]',
  refund_requested: 'border-[#f3b526] text-[#f3b526]',
  refund_reviewing: 'border-[#f3b526] text-[#f3b526]',
  refunded: 'border-[#888888] text-[#888888]',
  canceled: 'border-[#888888] text-[#888888]',
}

export async function listOrdersForProfile(profileId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

export async function createOrder(params: {
  profileId: string
  product: 1 | 2 | 3
  topConcern: string
  subConcern: string
  concernText?: string
  cashReceiptPhone?: string
}): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('create_order', {
    p_profile_id: params.profileId,
    p_product: params.product,
    p_top_concern: params.topConcern,
    p_sub_concern: params.subConcern,
    p_concern_text: params.concernText ?? null,
    p_cash_receipt_phone: params.cashReceiptPhone ?? null,
  })
  if (error) throw error
  return data as OrderRow
}

// 마이 > 결제 정보 — 이 계정의 전체 주문 (사주 구분 없이)
export async function listMyOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

// 환불 신청 — 결제 완료 + 분석 열람 전만 가능(결정 #4). 환불 계좌는 지민이 직접 이체할 곳(§11.5)
export async function requestRefund(params: {
  orderId: string
  reason: string
  bank: string
  account: string
  holder: string
}): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('request_refund', {
    p_order_id: params.orderId,
    p_reason: params.reason,
    p_bank: params.bank,
    p_account: params.account,
    p_holder: params.holder,
  })
  if (error) throw error
  return data as OrderRow
}

// 회원 탈퇴 신청 — 진행 중 주문이 있으면 서버가 거부(ACTIVE_ORDERS)
export async function requestWithdrawal(): Promise<void> {
  const { error } = await supabase.rpc('request_withdrawal')
  if (error) throw error
}

export async function reportDeposit(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('report_deposit', { p_order_id: orderId })
  if (error) throw error
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
