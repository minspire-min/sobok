'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
const heart = '/assets/heart.png'
import { DetailModal } from '../components/DetailModal'
import { PixelButton } from '../components/PixelButton'
import { PixelCheckbox } from '../components/PixelCheckbox'
import { useAuth } from '../lib/auth'

// PRD §6.3 — 카카오·구글 두 버튼. 최초 로그인 시 약관·개인정보(필수), 마케팅(선택) 동의.
// OAuth 왕복 후에도 이 화면으로 돌아와(redirectTo=/login) 동의 여부에 따라 분기한다.
export function LoginScreen() {
  const { loading, session, consented, signInWithProvider, completeConsent } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const storedNext = typeof window === 'undefined' ? null : sessionStorage.getItem('auth:next')
  const next = searchParams.get('next') ?? storedNext ?? '/saju'

  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && session && consented) {
      sessionStorage.removeItem('auth:next')
      router.replace(next)
    }
  }, [loading, session, consented, router, next])

  if (loading) return <div className="min-h-dvh bg-[#1a1a1a]" />

  async function handleConsent() {
    if (!terms || !privacy || submitting) return
    setSubmitting(true)
    try {
      await completeConsent(marketing)
      sessionStorage.removeItem('auth:next')
      router.replace(next)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-12 bg-[#1a1a1a] px-4 py-[60px]">
      <div className="flex flex-col items-center gap-4">
        <img src={heart} alt="" className="h-16 w-[69px] object-cover" />
        <h1 className="font-['Mona12'] text-[32px] font-bold tracking-[1.28px] text-white md:text-[40px]">소福소福</h1>
        <p className="font-['Pretendard'] text-[14px] text-[#b1b1b1]">
          {session ? '시작하기 전에 동의가 필요해요' : '간편하게 로그인하고 내 사주를 확인해요'}
        </p>
      </div>

      {!session ? (
        <div className="flex w-full max-w-[361px] flex-col gap-3">
          {/* 소셜 버튼은 각 사 브랜드 가이드 색을 따른다 (픽셀 스타일 예외) */}
          <button
            type="button"
            onClick={() => void signInWithProvider('kakao', next)}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[6px] bg-[#FEE500] font-['Pretendard'] text-[16px] font-bold text-[#191919] active:translate-y-[2px]"
          >
            카카오로 시작하기
          </button>
          <button
            type="button"
            onClick={() => void signInWithProvider('google', next)}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[6px] border border-[#dadce0] bg-white font-['Pretendard'] text-[16px] font-bold text-[#1f1f1f] active:translate-y-[2px]"
          >
            Google로 시작하기
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-[361px] flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
            <PixelCheckbox
              id="consent-terms"
              label="(필수) 이용약관에 동의합니다."
              className="font-['Pretendard']"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <div className="flex items-center">
              <PixelCheckbox
                id="consent-privacy"
                label="(필수) 개인정보 수집·이용에 동의합니다."
                className="font-['Pretendard']"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
              />
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="shrink-0 font-['Pretendard'] text-[13px] text-white underline underline-offset-2"
              >
                전문 보기
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <PixelCheckbox
                id="consent-marketing"
                label="(선택) 마케팅·광고성 정보 수신에 동의합니다."
                className="font-['Pretendard']"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              {/* 결정표 #17 — 부적 교체 기간 알림이 나간다는 점을 강조해 고지 */}
              <p className="pl-7 font-['Pretendard'] text-[12px] leading-relaxed text-[#888]">
                동의하면 <span className="text-white/70">부적 교체 시기(받은 지 1년) 알림</span> 등 광고성 안내가 이메일로
                발송돼요. 동의하지 않아도 서비스 이용에는 제한이 없어요.
              </p>
            </div>
          </div>
          <PixelButton onClick={handleConsent} disabled={!terms || !privacy || submitting}>
            동의하고 시작하기
          </PixelButton>
        </div>
      )}

      {showPrivacy && (
        <DetailModal title="개인정보 수집 및 이용" onClose={() => setShowPrivacy(false)}>
          <div className="flex flex-col gap-4 text-[14px] text-[#101010]">
            <div className="flex flex-col gap-1">
              <p className="font-['Pretendard'] font-bold">[개인정보 수집 및 이용에 대한 동의]</p>
              <p className="font-['Pretendard']">- 수집 및 이용 주체: 소福소福 (대표 윤민지)</p>
              <p className="font-['Pretendard']">- 수집·이용 목적: 회원 관리, 사주 풀이 제공, 부적 상품 주문·배송</p>
              <p className="font-['Pretendard']">- 수집 항목: 이메일, 로그인 식별자, 등록한 사주 정보(이름/닉네임, 성별, 생년월일시)</p>
              <p className="font-['Pretendard']">- 보유 및 이용 기간: 회원 탈퇴 후 7일 이내 삭제. 단, 거래 기록은 관련 법령에 따른 기간 동안 분리 보관</p>
            </div>
            <p className="font-['Pretendard']">
              귀하는 개인정보 수집·이용에 동의하지 않을 권리가 있습니다. 동의를 거부하실 경우 서비스 이용이 제한됩니다.
            </p>
          </div>
        </DetailModal>
      )}
    </div>
  )
}
