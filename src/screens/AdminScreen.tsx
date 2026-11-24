'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  adminCancelOrder,
  adminCompleteRefund,
  adminConfirmDeposit,
  adminDeliver,
  adminExchangeDone,
  adminExchangeShip,
  adminGetOrderExtras,
  adminListOrders,
  adminListShipments,
  adminRejectClaim,
  adminRejectRefund,
  adminReturnComplete,
  adminReturnInTransit,
  adminReviewRefund,
  adminListReviews,
  adminSetMemo,
  adminSetReviewVisible,
  adminSetShippingTalismans,
  adminShip,
  adminSignIn,
  checkIsAdmin,
} from '../lib/adminApi'
import { adminAnswerInquiry, adminListInquiries, INQUIRY_STATUS_LABEL, type InquiryRow } from '../lib/inquiriesApi'
import type { ReviewRow } from '../lib/reviewsApi'
import { notify } from '../lib/notifyApi'
import { subConcernLabel, TOP_CONCERNS } from '../lib/concerns'
import { computeFiveElementCounts } from '../lib/elementScore'
import { ELEMENT_ORDER } from '../lib/elements'
import { profileToFormInput } from '../lib/profilesApi'
import { computeSaju } from '../lib/sajuPipeline'
import { formatDate, PAYMENT_STATUS_LABEL, SHIPPING_STATUS_LABEL, type OrderRow, type ShipmentRow } from '../lib/ordersApi'
import { formatWon, PRODUCTS } from '../lib/products'

// PRD §10.2 결제 관리 — 1차: 입금 확인 요청 처리. 라이트 테마(어드민은 픽셀 스타일 제외, §9.5)
type Tab = 'awaiting' | 'refund' | 'shipping' | 'inquiry' | 'review' | 'stats' | 'all'

export function AdminScreen() {
  const { loading, session, signOut } = useAuth()
  // 세션별 관리자 판정 — 세션이 바뀌면 자동으로 null(판정 전)로 돌아간다
  const [adminCheck, setAdminCheck] = useState<{ uid: string; ok: boolean } | null>(null)
  const isAdmin = session && adminCheck?.uid === session.user.id ? adminCheck.ok : null
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [shipments, setShipments] = useState<Record<string, ShipmentRow>>({})
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  // 주문 상세 (§10.2 사주 확인 상세)
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null)
  const [extras, setExtras] = useState<Awaited<ReturnType<typeof adminGetOrderExtras>> | null>(null)
  const [memoText, setMemoText] = useState('')
  const [tab, setTab] = useState<Tab>('awaiting')
  const [statsPeriod, setStatsPeriod] = useState<'7' | '30' | 'all'>('30')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    adminListOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
    adminListInquiries()
      .then(setInquiries)
      .catch(() => setInquiries([]))
    adminListShipments()
      .then(setShipments)
      .catch(() => setShipments({}))
    adminListReviews()
      .then(setReviews)
      .catch(() => setReviews([]))
  }, [])

  useEffect(() => {
    if (loading || !session) return
    let cancelled = false
    checkIsAdmin().then((ok) => {
      if (cancelled) return
      setAdminCheck({ uid: session.user.id, ok })
      if (ok) refresh()
    })
    return () => {
      cancelled = true
    }
  }, [loading, session, refresh])

  async function handleLogin() {
    setLoginError(null)
    try {
      await adminSignIn(email, password)
    } catch (e) {
      // 서버 잠금 훅 메시지(5회 실패 시 10분 잠금)는 그대로 노출
      const msg = e instanceof Error ? e.message : ''
      setLoginError(msg.includes('잠겼') ? msg : '로그인에 실패했어요. 이메일과 비밀번호를 확인해 주세요.')
    }
  }

  async function handleConfirm(o: OrderRow) {
    if (!window.confirm(`주문 ${o.order_code} · ${formatWon(o.amount)} 입금을 확인 처리할까요?`)) return
    setBusyId(o.id)
    try {
      const updated = await adminConfirmDeposit(o.id)
      setOrders((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
      void notify('paid', o.id) // 결제 확인 메일 (키 없으면 발송 대기 기록만)
    } catch {
      window.alert('처리에 실패했어요. 새로고침 후 다시 시도해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(o: OrderRow) {
    const memo = window.prompt(`주문 ${o.order_code}을(를) 취소합니다. 사유를 입력하세요.`, '고객 요청 취소')
    if (memo === null) return
    await runAction(o.id, () => adminCancelOrder(o.id, memo))
  }

  async function runAction(id: string, fn: () => Promise<OrderRow>): Promise<OrderRow | null> {
    setBusyId(id)
    try {
      const updated = await fn()
      setOrders((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
      return updated
    } catch {
      window.alert('처리에 실패했어요. 새로고침 후 다시 시도해 주세요.')
      return null
    } finally {
      setBusyId(null)
    }
  }

  async function handleCompleteRefund(o: OrderRow) {
    const acc = o.refund_account
    if (!window.confirm(`${acc?.bank ?? ''} ${acc?.account ?? ''} (${acc?.holder ?? ''})로 ${formatWon(o.amount)} 이체를 마쳤나요?\n확인을 누르면 환불 완료로 바뀌고 유료 콘텐츠가 잠깁니다.`)) return
    await runAction(o.id, () => adminCompleteRefund(o.id))
    void notify('refunded', o.id)
  }

  async function handleRejectRefund(o: OrderRow) {
    const memo = window.prompt('반려 사유를 입력하세요. (사용자 상태가 결제 완료로 돌아갑니다)')
    if (!memo) return
    await runAction(o.id, () => adminRejectRefund(o.id, memo))
  }

  const stats = useMemo(() => {
    const list = orders ?? []
    const today = new Date().toDateString()
    return {
      reported: list.filter((o) => o.payment_status === 'awaiting_deposit' && o.deposit_reported_at).length,
      awaiting: list.filter((o) => o.payment_status === 'awaiting_deposit').length,
      refunds: list.filter((o) => o.payment_status === 'refund_requested' || o.payment_status === 'refund_reviewing').length,
      paidToday: list.filter((o) => o.paid_at && new Date(o.paid_at).toDateString() === today).length,
      unanswered: inquiries.filter((q) => q.status === 'received').length,
      total: list.length,
    }
  }, [orders, inquiries])

  // 매출 통계 (4-5, §10) — 결제액·환불 차감 순매출·상품별/고민별 비중 (결제 확인일 기준)
  const salesStats = useMemo(() => {
    const list = orders ?? []
    const since = statsPeriod === 'all' ? 0 : Date.now() - Number(statsPeriod) * 24 * 60 * 60 * 1000
    const paidList = list.filter((o) => o.paid_at && new Date(o.paid_at).getTime() >= since)
    const gross = paidList.reduce((s, o) => s + o.amount, 0)
    const refundList = list.filter(
      (o) => o.payment_status === 'refunded' && o.refunded_at && new Date(o.refunded_at).getTime() >= since,
    )
    const refundSum = refundList.reduce((s, o) => s + (o.refund_amount ?? o.amount), 0)
    const byProduct = [1, 2, 3].map((p) => {
      const rows = paidList.filter((o) => o.product === p)
      return { product: p, count: rows.length, amount: rows.reduce((s, o) => s + o.amount, 0) }
    })
    const byConcern = TOP_CONCERNS.map((t) => {
      const rows = paidList.filter((o) => o.top_concern === t.key)
      return { label: t.label, count: rows.length, amount: rows.reduce((s, o) => s + o.amount, 0) }
    })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.amount - a.amount)
    return { gross, refundSum, net: gross - refundSum, paidCount: paidList.length, refundCount: refundList.length, byProduct, byConcern }
  }, [orders, statsPeriod])

  function openDetail(o: OrderRow) {
    setDetailOrder(o)
    setMemoText(o.admin_memo ?? '')
    setExtras(null)
    adminGetOrderExtras(o.id)
      .then(setExtras)
      .catch(() => setExtras({ reading: null, picks: null }))
  }

  async function handleSaveMemo() {
    if (!detailOrder) return
    try {
      const updated = await adminSetMemo(detailOrder.id, memoText)
      setOrders((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
      setDetailOrder(updated)
    } catch {
      window.alert('메모 저장에 실패했어요.')
    }
  }

  // 배송·제작 (3-3·3-4)
  async function handleSetTalismans(o: OrderRow) {
    const need = o.product === 2 ? 1 : 3
    const current = (o.shipping_talismans ?? []).map((t) => `${t.hanja}:${t.korean}`).join(', ')
    const input = window.prompt(
      `배송 부적 ${need}개를 "한자:한글" 형식으로 입력하세요. 여러 개면 쉼표로 구분.\n예: 招財進寶:초재진보`,
      current,
    )
    if (input === null) return
    const items = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [hanja, korean] = s.split(':').map((x) => x.trim())
        return { hanja: hanja ?? '', korean: korean ?? '' }
      })
    if (items.length !== need || items.some((i) => !i.hanja || !i.korean)) {
      window.alert(`${need}개를 "한자:한글" 형식으로 입력해 주세요.`)
      return
    }
    await runAction(o.id, () => adminSetShippingTalismans(o.id, items))
  }

  async function handleShip(o: OrderRow) {
    const carrier = window.prompt('택배사를 입력하세요.', 'CU 편의점택배')
    if (!carrier) return
    const tracking = window.prompt('송장번호를 입력하세요.')
    if (!tracking) return
    const updated = await runAction(o.id, () => adminShip(o.id, carrier, tracking))
    if (updated) void notify('shipped', o.id) // 발송 알림 (4-4)
    adminListShipments().then(setShipments).catch(() => {})
  }

  async function handleDeliver(o: OrderRow) {
    if (!window.confirm(`주문 ${o.order_code}을(를) 배송 완료 처리할까요?`)) return
    await runAction(o.id, () => adminDeliver(o.id))
    adminListShipments().then(setShipments).catch(() => {})
  }

  // 교환·반품 (3-5)
  async function handleExchangeShip(o: OrderRow) {
    const carrier = window.prompt('교환품 택배사를 입력하세요.', 'CU 편의점택배')
    if (!carrier) return
    const tracking = window.prompt('새 송장번호를 입력하세요.')
    if (!tracking) return
    await runAction(o.id, () => adminExchangeShip(o.id, carrier, tracking))
    adminListShipments().then(setShipments).catch(() => {})
  }

  async function handleReturnComplete(o: OrderRow) {
    const amount = o.refund_amount ?? o.amount
    if (!window.confirm(`반품 회수를 확인했고, ${formatWon(amount)} 환불 이체를 마쳤나요?\n확인을 누르면 반품·환불 완료로 처리됩니다.`)) return
    await runAction(o.id, () => adminReturnComplete(o.id))
    void notify('refunded', o.id)
  }

  async function handleRejectClaim(o: OrderRow) {
    const memo = window.prompt('반려 사유를 입력하세요. (배송 완료·결제 완료 상태로 돌아갑니다)')
    if (!memo) return
    await runAction(o.id, () => adminRejectClaim(o.id, memo))
  }

  async function handleAnswer(q: InquiryRow) {
    if (!answerText.trim()) return
    try {
      const updated = await adminAnswerInquiry(q.id, answerText)
      setInquiries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setAnsweringId(null)
      setAnswerText('')
      void notify('inquiry_answered', q.id) // 답변 알림 (§6.6 — 알림 없으면 사용자가 다시 들어와야 함)
    } catch {
      window.alert('답변 저장에 실패했어요. 새로고침 후 다시 시도해 주세요.')
    }
  }

  const visible = useMemo(() => {
    const list = orders ?? []
    if (tab === 'all') return list
    if (tab === 'refund') {
      return list.filter((o) => ['refund_requested', 'refund_reviewing', 'refunded'].includes(o.payment_status))
    }
    // 입금 대기 탭 — 입금 확인 요청이 온 주문을 맨 위로
    return list
      .filter((o) => o.payment_status === 'awaiting_deposit')
      .sort((a, b) => Number(Boolean(b.deposit_reported_at)) - Number(Boolean(a.deposit_reported_at)))
  }, [orders, tab])

  if (loading) return <div className="min-h-dvh bg-white" />

  // 로그인 or 권한 없음
  if (!session || isAdmin === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f5] px-4 font-['Pretendard']">
        <div className="w-full max-w-[360px] rounded-lg border border-[#e5e5e5] bg-white p-6">
          <h1 className="mb-1 text-[18px] font-bold text-[#101010]">소복소복 어드민</h1>
          {isAdmin === false ? (
            <div className="flex flex-col gap-3">
              <p className="text-[14px] text-[#666]">이 계정({session?.user.email})은 관리자가 아니에요.</p>
              <button type="button" onClick={() => void signOut()} className="h-[44px] rounded-md bg-[#101010] text-[14px] text-white">
                다른 계정으로 로그인
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="mb-2 text-[13px] text-[#888]">관리자 이메일 계정으로 로그인하세요.</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                className="h-[44px] rounded-md border border-[#ddd] px-3 text-[14px] text-[#101010] focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                placeholder="비밀번호"
                className="h-[44px] rounded-md border border-[#ddd] px-3 text-[14px] text-[#101010] focus:outline-none"
              />
              {loginError && <p className="text-[13px] text-[#d61f34]">{loginError}</p>}
              <button type="button" onClick={() => void handleLogin()} className="h-[44px] rounded-md bg-[#101010] text-[14px] text-white">
                로그인
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5] font-['Pretendard'] text-[#101010]">
      <header className="flex items-center justify-between border-b border-[#e5e5e5] bg-white px-5 py-3">
        <h1 className="text-[16px] font-bold">소복소복 어드민 · 결제 관리</h1>
        <div className="flex items-center gap-3">
          <button type="button" onClick={refresh} className="rounded-md border border-[#ddd] px-3 py-1.5 text-[13px]">
            새로고침
          </button>
          <button type="button" onClick={() => void signOut()} className="text-[13px] text-[#888] underline underline-offset-2">
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 p-5">
        {/* 대시보드 카드 — 오늘 할 일 + 미처리 누적 (PRD §10.2) */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['입금 확인 요청', stats.reported, '#f31bc0'],
            ['입금 대기 전체', stats.awaiting, '#101010'],
            ['환불 처리 중', stats.refunds, '#f3b526'],
            ['미답변 문의', stats.unanswered, '#d61f34'],
            ['오늘 결제 완료', stats.paidToday, '#17c666'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-lg border border-[#e5e5e5] bg-white p-4">
              <p className="text-[12px] text-[#888]">{label}</p>
              <p className="text-[24px] font-bold" style={{ color: color as string }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {(
            [
              ['awaiting', '입금 대기'],
              ['refund', '환불'],
              ['shipping', '배송·제작'],
              ['inquiry', '문의'],
              ['review', '리뷰'],
              ['stats', '매출 통계'],
              ['all', '전체 주문'],
            ] as Array<[Tab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-4 py-2 text-[13px] ${tab === key ? 'bg-[#101010] text-white' : 'border border-[#ddd] bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 배송·제작 탭 — 제작 목록(지정 부적·사주는 코드 클릭 상세에서) + 송장 처리 (3-3·3-4) */}
        {tab === 'shipping' && (
          <div className="flex flex-col gap-3">
            {(() => {
              // 반품·교환 건은 결제 상태가 환불 쪽으로 바뀌어도 이 탭에 남아야 함 (시트 #19)
              const list = (orders ?? []).filter(
                (o) =>
                  o.product > 1 &&
                  o.shipping_status &&
                  (o.payment_status === 'paid' ||
                    o.shipping_status.startsWith('return') ||
                    o.shipping_status.startsWith('exchange')),
              )
              const rank = {
                exchange_requested: 0,
                return_requested: 0,
                awaiting: 1,
                exchange_shipping: 2,
                shipping: 2,
                return_shipping: 2,
                delivered: 3,
                exchange_done: 4,
                return_done: 4,
              } as Record<string, number>
              const sorted = [...list].sort((a, b) => (rank[a.shipping_status!] ?? 9) - (rank[b.shipping_status!] ?? 9))
              if (sorted.length === 0)
                return <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center text-[13px] text-[#888]">제작·배송할 주문이 없어요.</div>
              return sorted.map((o) => {
                const ship = shipments[o.id]
                return (
                  <div key={o.id} className="flex flex-col gap-2 rounded-lg border border-[#e5e5e5] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span>
                        <button type="button" onClick={() => openDetail(o)} className="font-bold underline underline-offset-2">
                          {o.order_code}
                        </button>
                        <span className="ml-2 text-[13px]">
                          {o.saju_snapshot?.nickname} · {subConcernLabel(o.sub_concern)} · 부적 {o.product === 2 ? 1 : 3}장
                        </span>
                      </span>
                      <span className="rounded-full bg-[#101010] px-2 py-[2px] text-[11px] text-white">
                        {SHIPPING_STATUS_LABEL[o.shipping_status!]}
                      </span>
                    </div>

                    <p className="text-[13px]">
                      {ship ? (
                        <>({ship.postcode}) {ship.address} {ship.address_detail ?? ''} · {ship.receiver} {ship.phone}
                        {ship.memo && <span className="text-[#888]"> · 메모: {ship.memo}</span>}</>
                      ) : (
                        <span className="font-bold text-[#d61f34]">배송지 미입력</span>
                      )}
                    </p>

                    <p className="text-[13px]">
                      그릴 부적:{' '}
                      {o.shipping_talismans?.length
                        ? o.shipping_talismans.map((t) => `${t.hanja}(${t.korean})`).join(', ')
                        : <span className="font-bold text-[#f3b526]">미지정 — 사주를 보고 지정해 주세요</span>}
                    </p>

                    <div className="flex gap-2">
                      {o.shipping_status === 'awaiting' && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleSetTalismans(o)}
                            className="rounded-md border border-[#ddd] px-3 py-1.5 text-[12px] disabled:opacity-40"
                          >
                            부적 지정
                          </button>
                          <button
                            type="button"
                            disabled={busyId === o.id || !ship || !o.shipping_talismans?.length}
                            onClick={() => void handleShip(o)}
                            className="rounded-md bg-[#17c666] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                          >
                            발송 처리 (송장 입력)
                          </button>
                        </>
                      )}
                      {o.shipping_status === 'shipping' && (
                        <>
                          <span className="py-1.5 text-[12px] text-[#555]">
                            {ship?.carrier} {ship?.tracking_no}
                          </span>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleDeliver(o)}
                            className="rounded-md bg-[#101010] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                          >
                            배송 완료 처리
                          </button>
                        </>
                      )}
                      {o.shipping_status === 'delivered' && (
                        <span className="py-1.5 text-[12px] text-[#888]">배송 완료 {ship?.delivered_at ? formatDate(ship.delivered_at) : ''}</span>
                      )}
                      {o.shipping_status === 'exchange_requested' && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleExchangeShip(o)}
                            className="rounded-md bg-[#f3b526] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                          >
                            교환 발송 (새 송장)
                          </button>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleRejectClaim(o)}
                            className="rounded-md border border-[#ddd] px-3 py-1.5 text-[12px] disabled:opacity-40"
                          >
                            반려
                          </button>
                        </>
                      )}
                      {o.shipping_status === 'exchange_shipping' && (
                        <>
                          <span className="py-1.5 text-[12px] text-[#555]">{ship?.carrier} {ship?.tracking_no}</span>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void runAction(o.id, () => adminExchangeDone(o.id))}
                            className="rounded-md bg-[#101010] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                          >
                            교환 완료 처리
                          </button>
                        </>
                      )}
                      {(o.shipping_status === 'return_requested' || o.shipping_status === 'return_shipping') && (
                        <>
                          {o.shipping_status === 'return_requested' && (
                            <button
                              type="button"
                              disabled={busyId === o.id}
                              onClick={() => void runAction(o.id, () => adminReturnInTransit(o.id))}
                              className="rounded-md border border-[#ddd] px-3 py-1.5 text-[12px] disabled:opacity-40"
                            >
                              반품 배송중 표시
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleReturnComplete(o)}
                            className="rounded-md bg-[#17c666] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                          >
                            회수 확인·환불 완료
                          </button>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleRejectClaim(o)}
                            className="rounded-md border border-[#ddd] px-3 py-1.5 text-[12px] disabled:opacity-40"
                          >
                            반려
                          </button>
                        </>
                      )}
                      {(o.shipping_status === 'exchange_done' || o.shipping_status === 'return_done') && (
                        <span className="py-1.5 text-[12px] text-[#888]">{SHIPPING_STATUS_LABEL[o.shipping_status]}</span>
                      )}
                    </div>
                    {o.claim_reason && ['exchange_requested', 'exchange_shipping', 'return_requested', 'return_shipping'].includes(o.shipping_status ?? '') && (
                      <p className="text-[12px] text-[#888]">
                        사유: {o.claim_reason}
                        {o.shipping_status?.startsWith('return') && (
                          <>
                            {' '}· 환불 예정 <span className="font-bold text-[#101010]">{formatWon(o.refund_amount ?? o.amount)}</span>
                            {o.refund_account && ` → ${o.refund_account.bank} ${o.refund_account.account} (${o.refund_account.holder})`}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* 문의 탭 — 미답변 우선, 인라인 답변 작성 (§10.2 문의 메뉴) */}
        {tab === 'inquiry' && (
          <div className="flex flex-col gap-3">
            {inquiries.length === 0 && (
              <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center text-[13px] text-[#888]">접수된 문의가 없어요.</div>
            )}
            {[...inquiries]
              .sort((a, b) => Number(a.status === 'answered') - Number(b.status === 'answered'))
              .map((q) => (
                <div key={q.id} className="flex flex-col gap-2 rounded-lg border border-[#e5e5e5] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#888]">
                      [{q.type}] {formatDate(q.created_at)}
                      {q.order_id && <span className="ml-2 text-[12px]">· 관련 주문 있음</span>}
                    </span>
                    <span className={`rounded-full px-2 py-[2px] text-[11px] text-white ${q.status === 'answered' ? 'bg-[#17c666]' : 'bg-[#d61f34]'}`}>
                      {INQUIRY_STATUS_LABEL[q.status]}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed break-keep">{q.body}</p>
                  {q.answer && (
                    <div className="rounded-md bg-[#f5f5f5] px-3 py-2">
                      <p className="text-[12px] text-[#888]">답변 ({q.answered_at ? formatDate(q.answered_at) : ''})</p>
                      <p className="text-[13px] leading-relaxed break-keep">{q.answer}</p>
                    </div>
                  )}
                  {q.status === 'received' &&
                    (answeringId === q.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="답변을 입력하세요"
                          className="h-[96px] resize-none rounded-md border border-[#ddd] px-3 py-2 text-[13px] focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAnswer(q)}
                            className="rounded-md bg-[#101010] px-4 py-2 text-[12px] text-white"
                          >
                            답변 저장
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnsweringId(null)
                              setAnswerText('')
                            }}
                            className="rounded-md border border-[#ddd] px-4 py-2 text-[12px]"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAnsweringId(q.id)
                          setAnswerText('')
                        }}
                        className="self-start rounded-md border border-[#ddd] px-4 py-2 text-[12px]"
                      >
                        답변 작성
                      </button>
                    ))}
                </div>
              ))}
          </div>
        )}

        {/* 리뷰 탭 — 승인(노출)한 리뷰만 메인에 보임 (4-2, §10.2) */}
        {tab === 'review' && (
          <div className="flex flex-col gap-3">
            {reviews.length === 0 && (
              <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center text-[13px] text-[#888]">작성된 리뷰가 없어요.</div>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-[#e5e5e5] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#888]">
                    <span className="mr-2 text-[#f3b526]">{'★'.repeat(r.rating)}</span>
                    {r.nickname} · {formatDate(r.created_at)}
                  </span>
                  <span className={`rounded-full px-2 py-[2px] text-[11px] text-white ${r.visible ? 'bg-[#17c666]' : 'bg-[#888]'}`}>
                    {r.visible ? '메인 노출 중' : '비노출'}
                  </span>
                </div>
                <p className="text-[14px] leading-relaxed break-keep">{r.body}</p>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => {
                    setBusyId(r.id)
                    adminSetReviewVisible(r.id, !r.visible)
                      .then((updated) => setReviews((prev) => prev.map((x) => (x.id === updated.id ? updated : x))))
                      .catch(() => window.alert('처리에 실패했어요. 새로고침 후 다시 시도해 주세요.'))
                      .finally(() => setBusyId(null))
                  }}
                  className={`self-start rounded-md px-4 py-2 text-[12px] disabled:opacity-40 ${
                    r.visible ? 'border border-[#ddd]' : 'bg-[#101010] text-white'
                  }`}
                >
                  {r.visible ? '노출 내리기' : '메인에 노출'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 매출 통계 탭 (4-5) — 어드민 목록 기준 집계, 최근 300건 한도 */}
        {tab === 'stats' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {(
                [
                  ['7', '최근 7일'],
                  ['30', '최근 30일'],
                  ['all', '전체'],
                ] as Array<['7' | '30' | 'all', string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatsPeriod(key)}
                  className={`rounded-md px-4 py-2 text-[13px] ${statsPeriod === key ? 'bg-[#101010] text-white' : 'border border-[#ddd] bg-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                ['결제액', salesStats.gross, `${salesStats.paidCount}건`, '#101010'],
                ['환불액', salesStats.refundSum, `${salesStats.refundCount}건`, '#d61f34'],
                ['순매출 (환불 차감)', salesStats.net, '', '#17c666'],
              ].map(([label, value, sub, color]) => (
                <div key={label as string} className="rounded-lg border border-[#e5e5e5] bg-white p-4">
                  <p className="text-[12px] text-[#888]">
                    {label} {sub ? <span className="ml-1">· {sub}</span> : null}
                  </p>
                  <p className="text-[24px] font-bold" style={{ color: color as string }}>
                    {formatWon(value as number)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[#e5e5e5] bg-white p-4">
              <p className="mb-3 text-[13px] font-bold">상품별 비중</p>
              <div className="flex flex-col gap-2">
                {salesStats.byProduct.map((row) => (
                  <div key={row.product} className="flex items-center gap-3 text-[13px]">
                    <span className="w-[150px] shrink-0">{PRODUCTS[row.product].name}</span>
                    <div className="h-3 flex-1 rounded-full bg-[#f0f0f0]">
                      <div
                        className="h-3 rounded-full bg-[#f31bc0]"
                        style={{ width: `${salesStats.gross ? Math.round((row.amount / salesStats.gross) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-[140px] shrink-0 text-right text-[#555]">
                      {row.count}건 · {formatWon(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e5e5] bg-white p-4">
              <p className="mb-3 text-[13px] font-bold">고민(상위)별 비중</p>
              {salesStats.byConcern.length === 0 && <p className="text-[13px] text-[#888]">기간 내 결제가 없어요.</p>}
              <div className="flex flex-col gap-2">
                {salesStats.byConcern.map((row) => (
                  <div key={row.label} className="flex items-center gap-3 text-[13px]">
                    <span className="w-[150px] shrink-0">{row.label}</span>
                    <div className="h-3 flex-1 rounded-full bg-[#f0f0f0]">
                      <div
                        className="h-3 rounded-full bg-[#f3b526]"
                        style={{ width: `${salesStats.gross ? Math.round((row.amount / salesStats.gross) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-[140px] shrink-0 text-right text-[#555]">
                      {row.count}건 · {formatWon(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[12px] text-[#888]">
              ※ 결제 확인일(paid_at) 기준 집계예요. 목록 한도(최근 300건)를 넘으면 오래된 주문은
              집계에서 빠져요.
            </p>
          </div>
        )}

        {tab !== 'inquiry' && tab !== 'shipping' && tab !== 'review' && tab !== 'stats' && (
        <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="border-b border-[#eee] text-[#888]">
              <tr>
                <th className="px-4 py-3 font-normal">주문일</th>
                <th className="px-4 py-3 font-normal">코드</th>
                <th className="px-4 py-3 font-normal">닉네임</th>
                <th className="px-4 py-3 font-normal">상품</th>
                <th className="px-4 py-3 font-normal">고민</th>
                <th className="px-4 py-3 font-normal">금액</th>
                <th className="px-4 py-3 font-normal">상태</th>
                <th className="px-4 py-3 font-normal">처리</th>
              </tr>
            </thead>
            <tbody>
              {!orders && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#888]">불러오는 중…</td>
                </tr>
              )}
              {orders && visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#888]">표시할 주문이 없어요.</td>
                </tr>
              )}
              {visible.map((o) => (
                <tr key={o.id} className="border-b border-[#f5f5f5]">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => openDetail(o)} className="font-bold underline underline-offset-2">
                      {o.order_code}
                    </button>
                  </td>
                  <td className="px-4 py-3">{o.saju_snapshot?.nickname ?? '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{PRODUCTS[o.product].name}{o.kind === 'repurchase' ? ' (재구매)' : ''}</td>
                  <td className="max-w-[220px] px-4 py-3">
                    {subConcernLabel(o.sub_concern)}
                    {o.concern_text && <p className="mt-1 text-[12px] text-[#888]">“{o.concern_text}”</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold">{formatWon(o.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {PAYMENT_STATUS_LABEL[o.payment_status]}
                    {o.payment_status === 'awaiting_deposit' && o.deposit_reported_at && (
                      <span className="ml-1 rounded-full bg-[#f31bc0] px-2 py-[2px] text-[11px] text-white">입금했어요 요청</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {o.payment_status === 'awaiting_deposit' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === o.id}
                          onClick={() => void handleConfirm(o)}
                          className="rounded-md bg-[#17c666] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                        >
                          입금 확인
                        </button>
                        <button
                          type="button"
                          disabled={busyId === o.id}
                          onClick={() => void handleCancel(o)}
                          className="rounded-md border border-[#ddd] px-3 py-1.5 text-[12px] disabled:opacity-40"
                        >
                          취소
                        </button>
                      </div>
                    )}
                    {/* 반품 건은 회수 확인 없이 환불되지 않도록 범용 환불 버튼 차단 (시트 #19) */}
                    {['refund_requested', 'refund_reviewing'].includes(o.payment_status) &&
                      ['return_requested', 'return_shipping'].includes(o.shipping_status ?? '') && (
                        <span className="text-[12px] text-[#888]">반품 건 — 배송·제작 탭에서 처리</span>
                      )}
                    {o.payment_status === 'refund_requested' &&
                      !['return_requested', 'return_shipping'].includes(o.shipping_status ?? '') && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void runAction(o.id, () => adminReviewRefund(o.id))}
                        className="rounded-md bg-[#f3b526] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                      >
                        검토 시작
                      </button>
                    )}
                    {o.payment_status === 'refund_reviewing' &&
                      !['return_requested', 'return_shipping'].includes(o.shipping_status ?? '') && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[12px] text-[#555]">
                          {o.refund_account?.bank} {o.refund_account?.account} ({o.refund_account?.holder})
                        </p>
                        {o.refund_reason && <p className="text-[12px] text-[#888]">사유: {o.refund_reason}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleCompleteRefund(o)}
                            className="rounded-md bg-[#17c666] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                          >
                            환불 완료
                          </button>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void handleRejectRefund(o)}
                            className="rounded-md border border-[#ddd] px-3 py-1.5 text-[12px] disabled:opacity-40"
                          >
                            반려
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </main>

      {/* 주문 상세 모달 — 사주·고민·분석·부적·메모 (§10.2) */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailOrder(null)}>
          <div
            className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-lg bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const snap = detailOrder.saju_snapshot
              const input = profileToFormInput(snap)
              const computation = computeSaju(input)
              const counts = computeFiveElementCounts(computation.result, computation.timeUnknown)
              const pillars = (['year', 'month', 'day', 'hour'] as const).map((p) => ({
                key: p,
                label: { year: '년', month: '월', day: '일', hour: '시' }[p],
                detail: computation.result.pillarDetails[p],
              }))
              return (
                <div className="flex flex-col gap-4 text-[13px]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-bold">
                      주문 {detailOrder.order_code} · {snap?.nickname}
                    </h2>
                    <button type="button" onClick={() => setDetailOrder(null)} className="text-[13px] text-[#888] underline">
                      닫기
                    </button>
                  </div>

                  {/* 사주 정보 */}
                  <div className="rounded-md bg-[#f5f5f5] p-3">
                    <p className="mb-2 font-bold">사주 정보</p>
                    <p>
                      {snap?.gender} · {snap?.calendar_type === 'lunar' ? '음력' : '양력'} {snap?.birth_year}.
                      {String(snap?.birth_month).padStart(2, '0')}.{String(snap?.birth_day).padStart(2, '0')}
                      {snap?.time_unknown
                        ? ' · 시간 모름'
                        : ` ${String(snap?.birth_hour).padStart(2, '0')}:${String(snap?.birth_minute).padStart(2, '0')}`}
                    </p>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                      {pillars.map((p) => (
                        <div key={p.key} className="rounded bg-white py-1">
                          <p className="text-[11px] text-[#888]">{p.label}주</p>
                          <p className="text-[15px] font-bold">
                            {p.key === 'hour' && computation.timeUnknown ? '—' : `${p.detail.stem}${p.detail.branch}`}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[12px] text-[#555]">
                      오행: {ELEMENT_ORDER.map((el) => `${el} ${counts[el]}`).join(' · ')}
                    </p>
                  </div>

                  {/* 고민 — 프런트와 동일한 저장본 (§10.2) */}
                  <div className="rounded-md bg-[#f5f5f5] p-3">
                    <p className="mb-1 font-bold">고민</p>
                    <p>
                      {subConcernLabel(detailOrder.sub_concern)}
                      {detailOrder.kind === 'repurchase' && ' (재구매)'}
                    </p>
                    {detailOrder.concern_text && <p className="mt-1 text-[#555]">“{detailOrder.concern_text}”</p>}
                  </div>

                  {/* 부적 추천·선택 */}
                  <div className="rounded-md bg-[#f5f5f5] p-3">
                    <p className="mb-1 font-bold">부적 {extras?.picks ? `(보충 오행 ${extras.picks.element})` : ''}</p>
                    {!extras && <p className="text-[#888]">불러오는 중…</p>}
                    {extras && !extras.picks && <p className="text-[#888]">아직 추천이 발급되지 않았어요.</p>}
                    {extras?.picks?.recommended.map((t) => (
                      <p key={t.id} className={extras.picks?.chosen_id === t.id ? 'font-bold text-[#f31bc0]' : ''}>
                        {t.hanja} ({t.korean}) — {t.meaning}
                        {t.personal && ' · 퍼스널'}
                        {extras.picks?.chosen_id === t.id && ' ✓ 선택'}
                      </p>
                    ))}
                  </div>

                  {/* 분석 저장본 */}
                  <div className="rounded-md bg-[#f5f5f5] p-3">
                    <p className="mb-1 font-bold">
                      분석 {extras?.reading ? `(${extras.reading.generator === 'mock' ? '임시 생성' : extras.reading.generator})` : ''}
                    </p>
                    {!extras && <p className="text-[#888]">불러오는 중…</p>}
                    {extras && !extras.reading && <p className="text-[#888]">아직 분석이 생성되지 않았어요.</p>}
                    {extras?.reading?.pages.map((pg, i) => (
                      <details key={pg.title} className="mb-1">
                        <summary className="cursor-pointer">
                          {i + 1}. {pg.title}
                        </summary>
                        <p className="mt-1 leading-relaxed text-[#555]">{pg.body}</p>
                      </details>
                    ))}
                  </div>

                  {/* 메모 */}
                  <div className="flex flex-col gap-2">
                    <p className="font-bold">메모</p>
                    <textarea
                      value={memoText}
                      onChange={(e) => setMemoText(e.target.value)}
                      placeholder="운영 메모 (예: 입금자명 불일치 확인함)"
                      className="h-[72px] resize-none rounded-md border border-[#ddd] px-3 py-2 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveMemo()}
                      className="self-start rounded-md bg-[#101010] px-4 py-2 text-[12px] text-white"
                    >
                      메모 저장
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
