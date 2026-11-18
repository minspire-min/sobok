import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase'
import { subConcernLabel } from '@/lib/concerns'
import { formatWon } from '@/lib/products'

// 이메일 알림 발송 (2-15, 결정 #8) — 어드민 처리 직후 호출된다.
// RESEND_API_KEY가 없으면 보내지 않고 email_outbox에 'skipped'로 기록만 한다(임의 처리 시트 #8).
// 호출자 검증: Authorization의 Supabase 토큰으로 is_admin()을 서버에서 확인 — 키는 서버에만 있다.
type NotifyType = 'paid' | 'refunded' | 'inquiry_answered' | 'shipped'

const SITE_URL = 'https://soboksobok-saju.vercel.app'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: isAdmin } = await db.rpc('is_admin')
  if (!isAdmin) return NextResponse.json({ error: 'ADMIN_ONLY' }, { status: 403 })

  const { type, refId } = (await request.json()) as { type: NotifyType; refId: string }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!['paid', 'refunded', 'inquiry_answered', 'shipped'].includes(type) || !UUID_RE.test(refId ?? '')) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  // 수신자·내용 구성 (수신 이메일은 주문·문의에 저장된 값 — 관리자 RLS로 조회)
  let toEmail: string | null = null
  let subject = ''
  let body = ''
  if (type === 'shipped') {
    const { data: order } = await db.from('orders').select('user_email, sub_concern, id').eq('id', refId).maybeSingle()
    if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    const { data: shipment } = await db.from('shipments').select('carrier, tracking_no').eq('order_id', refId).maybeSingle()
    toEmail = order.user_email
    subject = '[소福소福] 부적이 발송됐어요'
    body = `'${subConcernLabel(order.sub_concern)}' 주문의 부적이 발송됐어요.\n${shipment ? `${shipment.carrier} ${shipment.tracking_no}` : ''}\n\n배송 현황은 마이 > 결제 정보의 배송에서 확인할 수 있어요.\n${SITE_URL}/my`
  } else if (type === 'paid' || type === 'refunded') {
    const { data: order } = await db.from('orders').select('user_email, sub_concern, amount, profile_id, id').eq('id', refId).maybeSingle()
    if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    toEmail = order.user_email
    const concern = subConcernLabel(order.sub_concern)
    if (type === 'paid') {
      subject = '[소福소福] 결제가 확인됐어요'
      body = `주문하신 '${concern}' (${formatWon(order.amount)}) 결제가 확인됐어요.\n지금 사이트에서 고민별 사주 분석과 부적 추천을 확인해 보세요.\n\n${SITE_URL}/saju/${order.profile_id}/order?order=${order.id}`
    } else {
      subject = '[소福소福] 환불이 완료됐어요'
      body = `'${concern}' (${formatWon(order.amount)}) 주문의 환불 이체가 완료됐어요.\n입금까지 은행 사정에 따라 시간이 걸릴 수 있어요. 이용해 주셔서 감사해요.`
    }
  } else if (type === 'inquiry_answered') {
    const { data: inquiry } = await db.from('inquiries').select('user_email, type, answer').eq('id', refId).maybeSingle()
    if (!inquiry) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    toEmail = inquiry.user_email
    subject = '[소福소福] 문의하신 내용에 답변을 남겼어요'
    body = `[${inquiry.type}] 문의에 답변이 등록됐어요.\n\n${inquiry.answer ?? ''}\n\n자세한 내용은 마이 > 문의하기에서 확인해 주세요.\n${SITE_URL}/my`
  } else {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 })
  }

  if (!toEmail) {
    await db.from('email_outbox').insert({ template: type, ref_id: refId, to_email: '(없음)', subject, status: 'skipped', error: 'NO_EMAIL' })
    return NextResponse.json({ sent: false, reason: 'no_email' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    await db.from('email_outbox').insert({ template: type, ref_id: refId, to_email: toEmail, subject, status: 'skipped', error: 'NO_API_KEY' })
    return NextResponse.json({ sent: false, reason: 'no_key' })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'soboksobok <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      text: body,
    }),
  })
  const ok = res.ok
  const error = ok ? null : (await res.text()).slice(0, 300)
  await db.from('email_outbox').insert({ template: type, ref_id: refId, to_email: toEmail, subject, status: ok ? 'sent' : 'failed', error })
  return NextResponse.json({ sent: ok, ...(error ? { error } : {}) })
}
