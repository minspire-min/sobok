import { supabase } from './supabase'

// 어드민 처리 직후 이메일 알림 요청 — 실패해도 업무 흐름을 막지 않는다(발송 기록은 서버가 남김)
export async function notify(type: 'paid' | 'refunded' | 'inquiry_answered' | 'shipped', refId: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    await fetch('/api/notify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, refId }),
    })
  } catch {
    // 알림 실패는 조용히 — email_outbox에서 확인 가능
  }
}
