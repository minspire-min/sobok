import { Link } from 'react-router-dom'
import heart from '../assets/heart.png'
import { PixelButton } from '../components/PixelButton'

// PRD §6.2 메인 1차 — 소개 · 이용 방법 · 무료 안내 · 상품 3종 · 고민 진열 · FAQ · CTA.
// 상태별 메인(구매함 표시 등)과 리뷰 섹션은 단계 2·4에서 추가한다.

const STEPS = [
  { no: '1', title: '사주 등록', desc: '생년월일시를 입력하면 사주를 풀어 드려요' },
  { no: '2', title: '무료 해석', desc: '일간 이야기 다섯 줄과 만세력을 무료로 보여 드려요' },
  { no: '3', title: '고민 선택', desc: '지금 마음에 걸리는 고민 하나를 골라 주세요' },
  { no: '4', title: '부적 받기', desc: '사주와 고민에 맞는 부적을 추천해 드려요' },
]

// PRD §8.1 상위 고민 9종 — 메인에서는 진열만 하고, 선택·결제는 내 사주 쪽 한 곳에서만.
const TOP_CONCERNS = ['회사', '성장', '연애/결혼', '인간관계', '가족/육아', '재물/돈', '건강', '마음/멘탈', '학업/시험']

const PRODUCTS = [
  { name: '이미지 부적', price: '3,000원', desc: '고민별 사주 분석 5페이지와 추천 부적 3종 중 1개를 골라 이미지로 간직해요' },
  { name: '이미지 + 부적 1장', price: '20,000원', desc: '이미지 부적에 더해, 사주와 고민에 맞춰 직접 그린 부적 1장을 보내 드려요' },
  { name: '이미지 + 부적 3장', price: '50,000원', desc: '직접 그린 부적 3장을 보내 드려요. 소중한 사람과 나누기 좋아요' },
]

const FAQS = [
  { q: '태어난 시간을 모르면 볼 수 없나요?', a: '볼 수 있어요. 시간을 빼고 여섯 글자 기준으로 풀어 드리고, 그 기준임을 함께 알려 드려요.' },
  { q: '실물 부적은 얼마나 걸리나요?', a: '한 장 한 장 손으로 그려서 보내 드려요. 결제 후 제작과 배송에 걸리는 예상 기간을 안내해 드릴 예정이에요.' },
  { q: '환불이 되나요?', a: '분석을 열람하기 전에는 환불이 가능해요. 자세한 기준은 결제 전에 안내해 드려요.' },
]

export function HomeScreen() {
  return (
    <div className="flex flex-col items-center gap-[60px] px-4 py-[60px]">
      {/* 히어로 */}
      <section className="flex w-full max-w-[361px] flex-col items-center gap-6 text-center">
        <img src={heart} alt="" className="h-16 w-[69px] object-cover" />
        <h1 className="font-['Mona12'] text-[40px] font-bold tracking-[1.6px]">소福소福</h1>
        <p className="font-['Pretendard'] text-[16px] leading-relaxed text-white/80">
          사주로 알아보는 나의 이야기,
          <br />
          그리고 나를 응원하는 부적 한 장.
        </p>
        <Link to="/saju" className="w-full">
          <PixelButton>내 사주 보러 가기</PixelButton>
        </Link>
      </section>

      {/* 이용 방법 */}
      <section className="flex w-full max-w-[361px] flex-col gap-6">
        <h2 className="text-center font-['Mona12'] text-[16px] font-bold md:text-[20px]">이용 방법</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((s) => (
            <li key={s.no} className="flex items-start gap-4 rounded-[4px] border border-white/50 bg-white/5 px-4 py-4">
              <span className="font-['Mona12'] text-[18px] font-bold text-[#f31bc0]">{s.no}</span>
              <div className="flex flex-col gap-1">
                <p className="font-['Mona12'] text-[14px] tracking-[1.12px]">{s.title}</p>
                <p className="font-['Pretendard'] text-[14px] text-white/70">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 무료로 받는 것 */}
      <section className="flex w-full max-w-[361px] flex-col gap-4 text-center">
        <h2 className="font-['Mona12'] text-[16px] font-bold md:text-[20px]">무료로 볼 수 있어요</h2>
        <div className="rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
          <p className="font-['Pretendard'] text-[14px] leading-relaxed text-white/80">
            회원가입만 하면 <span className="font-bold text-white">일간 이야기 다섯 줄</span>과{' '}
            <span className="font-bold text-white">만세력(사주 여덟 글자 · 십신 · 신살 · 오행 분포)</span>을 무료로 보여 드려요.
            최대 8명까지 등록해 가족·친구의 사주도 함께 볼 수 있어요.
          </p>
        </div>
      </section>

      {/* 상품 3종 */}
      <section className="flex w-full max-w-[361px] flex-col gap-4">
        <h2 className="text-center font-['Mona12'] text-[16px] font-bold md:text-[20px]">부적 상품</h2>
        <div className="flex flex-col gap-3">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="flex flex-col gap-2 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
              <div className="flex items-center justify-between">
                <p className="font-['Mona12'] text-[14px] tracking-[1.12px]">{p.name}</p>
                <p className="font-['Pretendard'] text-[16px] font-bold text-[#f31bc0]">{p.price}</p>
              </div>
              <p className="font-['Pretendard'] text-[14px] leading-relaxed text-white/70">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[12px] text-[#888]">
          <span>※</span> <span className="font-['Pretendard']">가격은 부가세 별도이며, 결제 기능은 준비 중이에요.</span>
        </p>
        <p className="text-center text-[12px] text-[#888]">
          <span>※</span>{' '}
          <span className="font-['Pretendard']">
            배송되는 실물 부적은 이미지 부적과 달라요. 사주와 고민을 보고 그에 맞게 직접 그려서 보내 드려요.
          </span>
        </p>
      </section>

      {/* 고민 진열 */}
      <section className="flex w-full max-w-[361px] flex-col gap-4">
        <h2 className="text-center font-['Mona12'] text-[16px] font-bold md:text-[20px]">어떤 고민이 있나요?</h2>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-[14px]">
          {TOP_CONCERNS.map((c) => (
            <Link
              key={c}
              to="/saju"
              className="rounded-[4px] bg-white px-4 pt-[11px] pb-[10px] font-['Mona12'] text-[14px] tracking-[1.12px] text-[#101010] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)]"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="flex w-full max-w-[361px] flex-col gap-4">
        <h2 className="text-center font-['Mona12'] text-[16px] font-bold md:text-[20px]">자주 묻는 질문</h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((f) => (
            <div key={f.q} className="flex flex-col gap-2 rounded-[4px] border border-white/50 bg-white/5 px-4 py-4">
              <p className="font-['Pretendard'] text-[14px] font-bold">{f.q}</p>
              <p className="font-['Pretendard'] text-[14px] leading-relaxed text-white/70">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="w-full max-w-[361px]">
        <Link to="/saju" className="block w-full">
          <PixelButton>내 사주 보러 가기</PixelButton>
        </Link>
      </section>
    </div>
  )
}
