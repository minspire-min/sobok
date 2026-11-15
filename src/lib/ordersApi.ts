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
  saju_snapshot: SajuProfileRow // 주문 시점의 사주 입력값 — 부적 추천 계산 기준
  created_at: string
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

export async function reportDeposit(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('report_deposit', { p_order_id: orderId })
  if (error) throw error
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
