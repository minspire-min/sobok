import { supabase } from './supabase'

// 문의하기 (PRD §6.6) — 교환·반품/환불 유형은 문의 대신 해당 신청 화면으로 유도한다
// (같은 요청이 두 곳으로 들어오면 처리가 어긋나기 때문).
export type InquiryType = '결제' | '배송' | '사주·분석' | '기타'

export type InquiryRow = {
  id: string
  user_id: string
  order_id: string | null
  type: InquiryType
  body: string
  status: 'received' | 'answered'
  answer: string | null
  answered_at: string | null
  created_at: string
}

export const INQUIRY_STATUS_LABEL: Record<InquiryRow['status'], string> = {
  received: '접수',
  answered: '답변 완료',
}

export async function listMyInquiries(): Promise<InquiryRow[]> {
  const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as InquiryRow[]
}

export async function createInquiry(params: { type: InquiryType; body: string; orderId?: string }): Promise<InquiryRow> {
  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      type: params.type,
      body: params.body.trim(),
      order_id: params.orderId ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as InquiryRow
}

export async function adminListInquiries(): Promise<InquiryRow[]> {
  const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(300)
  if (error) throw error
  return (data ?? []) as InquiryRow[]
}

export async function adminAnswerInquiry(inquiryId: string, answer: string): Promise<InquiryRow> {
  const { data, error } = await supabase.rpc('admin_answer_inquiry', { p_inquiry_id: inquiryId, p_answer: answer })
  if (error) throw error
  return data as InquiryRow
}
