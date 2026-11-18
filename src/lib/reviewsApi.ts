import { supabase } from './supabase.ts'

// 리뷰 (PRD §6.6·§6.2) — 결제 완료 주문당 1건, 어드민 승인(visible) 후 메인 노출
export type ReviewRow = {
  id: string
  order_id: string
  user_id: string
  rating: number
  body: string
  nickname: string
  visible: boolean
  created_at: string
}

export async function createReview(input: {
  orderId: string
  rating: number
  body: string
  nickname: string
}): Promise<ReviewRow> {
  const { data, error } = await supabase.rpc('create_review', {
    p_order_id: input.orderId,
    p_rating: input.rating,
    p_body: input.body,
    p_nickname: input.nickname,
  })
  if (error) throw error
  return data as ReviewRow
}

export async function listMyReviews(): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReviewRow[]
}

// 메인 리뷰 섹션 — 비로그인 포함 누구나. 안전한 컬럼만 돌려주는 서버 함수 사용 (시트 #23)
export async function listPublicReviews(limit = 10): Promise<ReviewRow[]> {
  const { data, error } = await supabase.rpc('list_public_reviews', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as ReviewRow[]
}
