import { supabase } from './supabase'

// 부적 추천·선택 — 매트릭스는 서버 전용이고, 클라이언트는 주문별 저장본(talisman_picks)만 본다(PRD §10).
export type TalismanCard = {
  id: string
  hanja: string
  korean: string
  meaning: string
  description: string
  personal: boolean // true = 퍼스널 추천(1번)
}

export type TalismanPicks = {
  order_id: string
  element: string
  reason: string | null
  recommended: TalismanCard[]
  chosen_id: string | null
  chosen_at: string | null
}

export async function issueTalismanPicks(orderId: string, element: string, reason: string): Promise<TalismanPicks> {
  const { data, error } = await supabase.rpc('issue_talisman_picks', {
    p_order_id: orderId,
    p_element: element,
    p_reason: reason,
  })
  if (error) throw error
  return data as TalismanPicks
}

export async function selectTalisman(orderId: string, talismanId: string): Promise<TalismanPicks> {
  const { data, error } = await supabase.rpc('select_talisman', {
    p_order_id: orderId,
    p_talisman_id: talismanId,
  })
  if (error) throw error
  return data as TalismanPicks
}
