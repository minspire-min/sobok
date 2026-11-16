'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DetailModal } from '../components/DetailModal'
import { PixelCheckbox } from '../components/PixelCheckbox'
import { Toast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { subConcernLabel } from '../lib/concerns'
import {
  formatDate,
  listMyOrders,
  requestRefund,
  requestWithdrawal,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  type OrderRow,
} from '../lib/ordersApi'
import { formatWon, PRODUCTS } from '../lib/products'

// PRD §6.6 마이 — 내 정보 · 결제 정보(환불 요청 포함) · 회원 탈퇴. 배송·리뷰·문의는 이후 단계.
const PROVIDER_LABEL: Record<string, string> = { kakao: '카카오', google: '구글', email: '이메일' }

export function MyPageScreen() {
  const { session, marketingConsent, updateMarketingConsent, signOut } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [refundTarget, setRefundTarget] = useState<OrderRow | null>(null)
  const [withdrawAsk, setWithdrawAsk] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 환불 폼
  const [reason, setReason] = useState('')
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [holder, setHolder] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const provider = (session?.user.app_metadata?.provider as string | undefined) ?? ''
  const email = session?.user.email ?? '-'

  useEffect(() => {
    listMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
  }, [])

  async function handleRefund() {
    if (!refundTarget || submitting) return
    if (!bank.trim() || !account.trim() || !holder.trim()) {
      setToast('환불받을 계좌 정보를 모두 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      const updated = await requestRefund({ orderId: refundTarget.id, reason, bank, account, holder })
      setOrders((prev) => (prev ?? []).map((o) => (o.id === updated.id ? updated : o)))
      setRefundTarget(null)
      setReason('')
      setBank('')
      setAccount('')
      setHolder('')
      setToast('환불 신청이 접수됐어요.')
    } catch (e) {
      const message =
        e instanceof Error && e.message.includes('ALREADY_VIEWED')
          ? '분석을 열람한 주문은 환불할 수 없어요.'
          : '환불 신청에 실패했어요. 잠시 후 다시 시도해 주세요.'
      setToast(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleWithdraw() {
    try {
      await requestWithdrawal()
      await signOut()
      router.replace('/')
    } catch (e) {
      setWithdrawAsk(false)
      setToast(
        e instanceof Error && e.message.includes('ACTIVE_ORDERS')
          ? '진행 중인 주문(입금 대기·환불 처리 중)이 있어 탈퇴할 수 없어요. 주문이 끝난 뒤 다시 시도해 주세요.'
          : '탈퇴 신청에 실패했어요. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  return (
    <div className="flex flex-col items-center gap-10 px-4 py-10">
      {/* 내 정보 */}
      <div className="flex w-full max-w-[345px] flex-col gap-4 md:max-w-[480px]">
        <h2 className="font-['Mona12'] text-[16px] font-bold md:text-[20px]">내 정보</h2>
        <div className="flex flex-col gap-3 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
          <div className="flex items-center justify-between">
            <span className="font-['Pretendard'] text-[14px] text-white/70">로그인 수단</span>
            <span className="font-['Pretendard'] text-[14px]">{PROVIDER_LABEL[provider] ?? provider ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-['Pretendard'] text-[14px] text-white/70">이메일</span>
            <span className="font-['Pretendard'] text-[14px]">{email}</span>
          </div>
          <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
            <PixelCheckbox
              id="my-marketing"
              label="마케팅·광고성 정보 수신 동의"
              className="font-['Pretendard']"
              checked={marketingConsent}
              onChange={(e) => void updateMarketingConsent(e.target.checked)}
            />
            <p className="pl-7 font-['Pretendard'] text-[12px] leading-relaxed text-[#888]">
              부적 교체 시기(받은 지 1년) 알림 등 광고성 안내가 이메일로 발송돼요.
            </p>
          </div>
        </div>
      </div>

      {/* 결제 정보 (PRD §6.6) */}
      <div className="flex w-full max-w-[345px] flex-col gap-4 md:max-w-[480px]">
        <h2 className="font-['Mona12'] text-[16px] font-bold md:text-[20px]">결제 정보</h2>
        {!orders && <p className="font-['Pretendard'] text-[14px] text-white/60">불러오는 중…</p>}
        {orders && orders.length === 0 && (
          <p className="font-['Pretendard'] text-[14px] text-white/60">아직 결제한 내역이 없어요.</p>
        )}
        {orders?.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 rounded-[4px] border border-white/50 bg-white/5 px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-['Pretendard'] text-[14px] font-bold">
                {o.saju_snapshot?.nickname} · {subConcernLabel(o.sub_concern)}
              </span>
              <span className={`rounded-full border-2 px-2 py-[2px] font-['Mona12'] text-[11px] ${PAYMENT_STATUS_COLOR[o.payment_status]}`}>
                {PAYMENT_STATUS_LABEL[o.payment_status]}
              </span>
            </div>
            <div className="flex items-center justify-between font-['Pretendard'] text-[13px] text-white/70">
              <span>
                {PRODUCTS[o.product].name}
                {o.kind === 'repurchase' ? ' (재구매)' : ''} · {formatDate(o.created_at)}
              </span>
              <span className="font-bold text-white">{formatWon(o.amount)}</span>
            </div>
            <div className="flex items-center justify-end gap-3">
              {o.payment_status === 'awaiting_deposit' && (
                <Link
                  href={`/saju/${o.profile_id}/order?order=${o.id}`}
                  className="font-['Pretendard'] text-[13px] text-[#f31bc0] underline underline-offset-2"
                >
                  입금 안내 보기
                </Link>
              )}
              {o.payment_status === 'paid' && (
                <>
                  <Link
                    href={`/saju/${o.profile_id}/order?order=${o.id}`}
                    className="font-['Pretendard'] text-[13px] text-[#f31bc0] underline underline-offset-2"
                  >
                    부적 보러 가기
                  </Link>
                  <button
                    type="button"
                    onClick={() => setRefundTarget(o)}
                    className="font-['Pretendard'] text-[13px] text-white/60 underline underline-offset-2"
                  >
                    환불 요청
                  </button>
                </>
              )}
              {(o.payment_status === 'refund_requested' || o.payment_status === 'refund_reviewing') && (
                <span className="font-['Pretendard'] text-[12px] text-[#888]">확인 후 환불 계좌로 입금해 드려요</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 준비 중 메뉴 */}
      <div className="flex w-full max-w-[345px] flex-col gap-4 md:max-w-[480px]">
        <div className="flex flex-col rounded-[4px] border border-white/50 bg-white/5 px-4">
          {['배송 정보', '리뷰 작성', '문의하기'].map((menu) => (
            <div key={menu} className="flex items-center justify-between border-b border-white/10 py-4 last:border-b-0">
              <span className="font-['Pretendard'] text-[14px] text-white/50">{menu}</span>
              <span className="font-['Pretendard'] text-[12px] text-[#888]">준비 중</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => router.replace('/'))
          }}
          className="font-['Pretendard'] text-[13px] text-[#888] underline underline-offset-2"
        >
          로그아웃
        </button>
        <button
          type="button"
          onClick={() => setWithdrawAsk(true)}
          className="font-['Pretendard'] text-[13px] text-[#555] underline underline-offset-2"
        >
          회원 탈퇴
        </button>
      </div>

      {/* 환불 신청 모달 — 환불 계좌를 받아 직접 이체(§11.5), 열람 후 불가(결정 #4) */}
      {refundTarget && (
        <DetailModal title="환불 요청" onClose={() => setRefundTarget(null)}>
          <div className="flex flex-col gap-3">
            <p className="font-['Pretendard'] text-[13px] leading-relaxed break-keep text-[#8c8c8c]">
              {subConcernLabel(refundTarget.sub_concern)} · {formatWon(refundTarget.amount)} 주문을 환불 요청해요. 확인
              후 입력하신 계좌로 돌려드려요. 분석을 열람한 주문은 환불이 어려워요.
            </p>
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="은행명"
              className="h-[44px] rounded-[4px] border border-[#ddd] px-3 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
            />
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/[^0-9-]/g, ''))}
              placeholder="계좌번호"
              inputMode="numeric"
              className="h-[44px] rounded-[4px] border border-[#ddd] px-3 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
            />
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="예금주"
              className="h-[44px] rounded-[4px] border border-[#ddd] px-3 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder="환불 사유 (선택)"
              className="h-[72px] resize-none rounded-[4px] border border-[#ddd] px-3 py-2 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRefund()}
              className="h-[44px] rounded-[4px] bg-[#f31bc0] font-['Pretendard'] text-[14px] text-white disabled:opacity-40"
            >
              환불 요청하기
            </button>
          </div>
        </DetailModal>
      )}

      {/* 탈퇴 확인 모달 (§10.3·§17.5) */}
      {withdrawAsk && (
        <DetailModal title="정말 탈퇴할까요?" onClose={() => setWithdrawAsk(false)}>
          <div className="flex flex-col gap-4">
            <p className="font-['Pretendard'] text-[14px] leading-relaxed break-keep text-[#101010]">
              탈퇴하면 등록한 사주와 개인정보가 7일 안에 삭제되고, 7일 동안은 다시 가입할 수 없어요. 거래 기록은 법령에
              따라 일정 기간 보관돼요. 진행 중인 주문이 있으면 탈퇴할 수 없어요.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWithdrawAsk(false)}
                className="h-[44px] flex-1 rounded-[4px] border border-[#101010] font-['Pretendard'] text-[14px] text-[#101010]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleWithdraw()}
                className="h-[44px] flex-1 rounded-[4px] bg-[#101010] font-['Pretendard'] text-[14px] text-white"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </DetailModal>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
