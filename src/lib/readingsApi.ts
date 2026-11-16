import { supabase } from './supabase'
import type { ReadingPage } from './mockReading'

export type ReadingRow = {
  order_id: string
  pages: ReadingPage[]
  generator: string
  created_at: string
}

// 분석 저장 — 주문당 1회(서버 멱등). 이후엔 저장본을 그대로 보여준다(§8)
export async function saveReading(orderId: string, pages: ReadingPage[], generator = 'mock'): Promise<ReadingRow> {
  const { data, error } = await supabase.rpc('save_reading', {
    p_order_id: orderId,
    p_pages: pages,
    p_generator: generator,
  })
  if (error) throw error
  return data as ReadingRow
}

// 최초 열람 기록 — 이 시점부터 환불 불가(결정 #4)
export async function markReadingViewed(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_reading_viewed', { p_order_id: orderId })
  if (error) throw error
}
