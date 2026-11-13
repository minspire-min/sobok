import { useNavigate } from 'react-router-dom'
import { PixelCheckbox } from '../components/PixelCheckbox'
import { useAuth } from '../lib/auth'

// PRD §6.6 마이 — 단계 1에서는 내 정보(로그인 수단·이메일·마케팅 수신)와 로그아웃만.
// 결제·배송·리뷰·문의·탈퇴는 단계 2에서 열린다.
const PROVIDER_LABEL: Record<string, string> = { kakao: '카카오', google: '구글' }

export function MyPageScreen() {
  const { session, marketingConsent, updateMarketingConsent, signOut } = useAuth()
  const navigate = useNavigate()

  const provider = (session?.user.app_metadata?.provider as string | undefined) ?? ''
  const email = session?.user.email ?? '-'

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex flex-col items-center gap-10 px-4 py-10">
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

      <div className="flex w-full max-w-[345px] flex-col gap-4 md:max-w-[480px]">
        <h2 className="font-['Mona12'] text-[16px] font-bold md:text-[20px]">준비 중인 메뉴</h2>
        <div className="flex flex-col rounded-[4px] border border-white/50 bg-white/5 px-4">
          {['결제 정보', '배송 정보', '리뷰 작성', '문의하기', '회원 탈퇴'].map((menu) => (
            <div key={menu} className="flex items-center justify-between border-b border-white/10 py-4 last:border-b-0">
              <span className="font-['Pretendard'] text-[14px] text-white/50">{menu}</span>
              <span className="font-['Pretendard'] text-[12px] text-[#888]">준비 중</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="font-['Pretendard'] text-[13px] text-[#888] underline underline-offset-2"
      >
        로그아웃
      </button>
    </div>
  )
}
