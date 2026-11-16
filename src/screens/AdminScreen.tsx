'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  adminCancelOrder,
  adminCompleteRefund,
  adminConfirmDeposit,
  adminListOrders,
  adminRejectRefund,
  adminReviewRefund,
  adminSignIn,
  checkIsAdmin,
} from '../lib/adminApi'
import { subConcernLabel } from '../lib/concerns'
import { formatDate, PAYMENT_STATUS_LABEL, type OrderRow } from '../lib/ordersApi'
import { formatWon, PRODUCTS } from '../lib/products'

// PRD §10.2 결제 관리 — 1차: 입금 확인 요청 처리. 라이트 테마(어드민은 픽셀 스타일 제외, §9.5)
type Tab = 'awaiting' | 'refund' | 'all'

export function AdminScreen() {
  const { loading, session, signOut } = useAuth()
  // 세션별 관리자 판정 — 세션이 바뀌면 자동으로 null(판정 전)로 돌아간다
  const [adminCheck, setAdminCheck] = useState<{ uid: string; ok: boolean } | null>(null)
  const isAdmin = session && adminCheck?.uid === session.user.id ? adminCheck.ok : null
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [tab, setTab] = useState<Tab>('awaiting')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    adminListOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
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
    } catch {
      setLoginError('로그인에 실패했어요. 이메일과 비밀번호를 확인해 주세요.')
    }
  }

  async function handleConfirm(o: OrderRow) {
    if (!window.confirm(`주문 ${o.order_code} · ${formatWon(o.amount)} 입금을 확인 처리할까요?`)) return
    setBusyId(o.id)
    try {
      const updated = await adminConfirmDeposit(o.id)
      setOrders((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
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

  async function runAction(id: string, fn: () => Promise<OrderRow>) {
    setBusyId(id)
    try {
      const updated = await fn()
      setOrders((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
    } catch {
      window.alert('처리에 실패했어요. 새로고침 후 다시 시도해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCompleteRefund(o: OrderRow) {
    const acc = o.refund_account
    if (!window.confirm(`${acc?.bank ?? ''} ${acc?.account ?? ''} (${acc?.holder ?? ''})로 ${formatWon(o.amount)} 이체를 마쳤나요?\n확인을 누르면 환불 완료로 바뀌고 유료 콘텐츠가 잠깁니다.`)) return
    await runAction(o.id, () => adminCompleteRefund(o.id))
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
      total: list.length,
    }
  }, [orders])

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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['입금 확인 요청', stats.reported, '#f31bc0'],
            ['입금 대기 전체', stats.awaiting, '#101010'],
            ['환불 처리 중', stats.refunds, '#f3b526'],
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
                  <td className="px-4 py-3 font-bold">{o.order_code}</td>
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
                    {o.payment_status === 'refund_requested' && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void runAction(o.id, () => adminReviewRefund(o.id))}
                        className="rounded-md bg-[#f3b526] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                      >
                        검토 시작
                      </button>
                    )}
                    {o.payment_status === 'refund_reviewing' && (
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
      </main>
    </div>
  )
}
