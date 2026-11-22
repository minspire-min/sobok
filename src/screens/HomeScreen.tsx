'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { HomeReviews } from '../components/HomeReviews'

const heart = '/assets/heart.png'

// PRD §6.2 메인 — 소개 · 숫자 띠 · 이용 방법 · 무료 안내 · 상품 3종 · 고민 진열 · 리뷰 · FAQ · CTA.
// 2026-11-22 리디자인: 다크+픽셀+마젠타 아이덴티티는 유지하고, 공간감(여백·글래스 카드)·
// 스프링 모션(sb-ease/sb-reveal, src/index.css)·섹션별로 다른 레이아웃을 더했다.

const STEPS = [
  { no: '1', title: '사주 등록', desc: '생년월일시를 입력하면 사주를 풀어 드려요' },
  { no: '2', title: '무료 해석', desc: '일간 이야기 다섯 줄과 만세력을 무료로 보여 드려요' },
  { no: '3', title: '고민 선택', desc: '지금 마음에 걸리는 고민 하나를 골라 주세요' },
  { no: '4', title: '부적 받기', desc: '사주와 고민에 맞는 부적을 추천해 드려요' },
]

// 과장 없는 실제 숫자만 (§8 — 만세력 여덟 글자 · 신살 26종 · 하위 고민 40가지)
const FACTS = [
  { value: '8글자', label: '만세력 사주 풀이' },
  { value: '26종', label: '신살 해석' },
  { value: '40가지', label: '고민 맞춤 추천' },
]

// 가격은 PRD §17.1 (부가세 별도)
const PRODUCTS = [
  {
    name: '사주 분석 + 이미지 부적',
    price: '10,000원',
    desc: '고민별 사주 분석 5페이지와 추천 부적 3종 중 1개를 골라 이미지로 간직해요',
    featured: false,
    badge: null,
  },
  {
    name: '+ 배송 부적 1장',
    price: '30,000원',
    desc: '이미지 부적에 더해, 사주와 고민에 맞춰 직접 그린 부적 1장을 보내 드려요',
    featured: false,
    badge: null,
  },
  {
    name: '+ 배송 부적 3장',
    price: '50,000원',
    desc: '직접 그린 부적 3장을 보내 드려요. 소중한 사람과 나누기 좋아요',
    featured: true,
    badge: '마음을 나누는 세 장',
  },
]

const TOP_CONCERNS = ['회사', '성장', '연애/결혼', '인간관계', '가족/육아', '재물/돈', '건강', '마음/멘탈', '학업/시험']

const FAQS = [
  { q: '태어난 시간을 모르면 볼 수 없나요?', a: '볼 수 있어요. 시간을 빼고 여섯 글자 기준으로 풀어 드리고, 그 기준임을 함께 알려 드려요.' },
  { q: '실물 부적은 얼마나 걸리나요?', a: '한 장 한 장 손으로 그려서 보내 드려요. 결제 후 제작과 배송에 걸리는 예상 기간을 안내해 드릴 예정이에요.' },
  { q: '환불이 되나요?', a: '분석을 열람하기 전에는 환불이 가능해요. 자세한 기준은 결제 전에 안내해 드려요.' },
]

// 메인 CTA — 필 버튼 + 원형 화살표 (호버 시 살짝 커지고 화살표가 앞으로)
function CtaButton({ label }: { label: string }) {
  return (
    <Link
      href="/saju"
      className="sb-ease group inline-flex w-full items-center justify-between rounded-full bg-[#f31bc0] py-3 pr-2 pl-7 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(243,27,192,0.25)] active:scale-[0.98]"
    >
      <span className="font-['Mona12'] text-[15px] font-bold tracking-[1.2px] text-white">{label}</span>
      <span className="sb-ease flex size-10 items-center justify-center rounded-full bg-black/25 group-hover:translate-x-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 12h15m-6-7 7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="square" />
        </svg>
      </span>
    </Link>
  )
}

export function HomeScreen() {
  // 스크롤 등장 — IntersectionObserver만 사용 (scroll 리스너 금지)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('sb-in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    document.querySelectorAll('.sb-reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="relative overflow-hidden">
      {/* 배경 — 은은한 먹빛 위 마젠타·호박색 오브 (장식, GPU-safe transform만) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="sb-float absolute -top-24 right-[-120px] size-[320px] rounded-full bg-[radial-gradient(circle,rgba(243,27,192,0.14),transparent_65%)]" />
        <div
          className="sb-float absolute top-[560px] left-[-140px] size-[360px] rounded-full bg-[radial-gradient(circle,rgba(243,181,38,0.08),transparent_65%)]"
          style={{ animationDelay: '-3s' }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-24 px-5 pt-20 pb-28">
        {/* 히어로 — 좌측 정렬 + 부유하는 심볼 (중앙 정렬 탈피) */}
        <section className="sb-reveal relative w-full max-w-[400px]">
          <img src={heart} alt="" className="sb-float absolute -top-8 right-1 h-14 w-[60px] object-cover opacity-90" />
          <span className="inline-block rounded-full bg-[#f31bc0]/10 px-3 py-1 font-['Mona12'] text-[11px] tracking-[0.15em] text-[#f31bc0]">
            사주 기반 맞춤 부적
          </span>
          <h1 className="mt-5 font-['Mona12'] text-[34px] leading-snug font-bold tracking-[1.4px] break-keep md:text-[42px]">
            나의 사주가 고른
            <br />단 하나의 부적
          </h1>
          <p className="mt-5 max-w-[32ch] font-['Pretendard'] text-[16px] leading-relaxed break-keep text-white/70">
            생년월일시로 사주를 풀고, 지금 마음에 걸리는 고민에 맞는 부적을 골라 드려요. 실물 부적은 한 장 한 장 손으로
            그려서 보냅니다.
          </p>
          <div className="mt-8">
            <CtaButton label="내 사주 보러 가기" />
          </div>
          <p className="mt-3 text-center font-['Pretendard'] text-[12px] text-white/40">
            회원가입만 하면 사주 풀이는 무료예요
          </p>
        </section>

        {/* 숫자 띠 — 과장 없는 실제 스펙 3가지 */}
        <section className="sb-reveal w-full max-w-[400px]">
          <div className="grid grid-cols-3 divide-x divide-white/10 rounded-[1.5rem] bg-white/5 py-5 ring-1 ring-white/10">
            {FACTS.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1.5 px-2 text-center">
                <span className="font-['Mona12'] text-[18px] font-bold tracking-[1px] text-[#f31bc0]">{f.value}</span>
                <span className="font-['Pretendard'] text-[11px] break-keep text-white/60">{f.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 이용 방법 — 세로 타임라인 (헤어라인 + 번호) */}
        <section className="w-full max-w-[400px]">
          <h2 className="sb-reveal font-['Mona12'] text-[18px] font-bold tracking-[1.2px] md:text-[20px]">이용 방법</h2>
          <ol className="mt-6 flex flex-col">
            {STEPS.map((s, i) => (
              <li key={s.no} className="sb-reveal relative flex gap-5 pb-8 last:pb-0" style={{ '--d': i } as React.CSSProperties}>
                {i < STEPS.length - 1 && <span className="absolute top-8 left-[13px] h-[calc(100%-2rem)] w-px bg-white/10" aria-hidden />}
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f31bc0]/10 font-['Mona12'] text-[13px] font-bold text-[#f31bc0]">
                  {s.no}
                </span>
                <div className="flex flex-col gap-1 pt-0.5">
                  <p className="font-['Mona12'] text-[14px] tracking-[1.12px]">{s.title}</p>
                  <p className="font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/60">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 무료로 받는 것 — 더블 베젤 글래스 카드 */}
        <section className="sb-reveal w-full max-w-[400px]">
          <div className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
            <div className="rounded-[calc(2rem-0.375rem)] bg-[#141414] px-6 py-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <span className="font-['Mona12'] text-[11px] tracking-[0.15em] text-[#f3b526]">무료</span>
              <p className="mt-3 font-['Pretendard'] text-[15px] leading-relaxed break-keep text-white/85">
                회원가입만 하면 <span className="font-bold text-white">일간 이야기 다섯 줄</span>과{' '}
                <span className="font-bold text-white">만세력(사주 여덟 글자 · 십신 · 신살 · 오행 분포)</span>을 보여
                드려요. 최대 8명까지 등록해 가족·친구의 사주도 함께 볼 수 있어요.
              </p>
            </div>
          </div>
        </section>

        {/* 부적 상품 — 카드 3종, 마지막 카드만 마젠타 링으로 또렷하게 */}
        <section className="w-full max-w-[400px]">
          <h2 className="sb-reveal font-['Mona12'] text-[18px] font-bold tracking-[1.2px] md:text-[20px]">부적 상품</h2>
          <div className="mt-6 flex flex-col gap-4">
            {PRODUCTS.map((p, i) => (
              <div
                key={p.name}
                className={`sb-reveal rounded-[1.75rem] p-1.5 ring-1 ${p.featured ? 'bg-[#f31bc0]/10 ring-[#f31bc0]/35' : 'bg-white/5 ring-white/10'}`}
                style={{ '--d': i } as React.CSSProperties}
              >
                <div className="rounded-[calc(1.75rem-0.375rem)] bg-[#141414] px-5 py-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  {p.badge && (
                    <span className="mb-3 inline-block rounded-full bg-[#f31bc0]/10 px-3 py-1 font-['Mona12'] text-[11px] tracking-[0.12em] text-[#f31bc0]">
                      {p.badge}
                    </span>
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-['Mona12'] text-[14px] leading-snug tracking-[1.12px] break-keep">{p.name}</p>
                    <p className="shrink-0 font-['Mona12'] text-[16px] font-bold text-[#f31bc0]">{p.price}</p>
                  </div>
                  <p className="mt-3 font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/60">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <p className="font-['Pretendard'] text-[12px] leading-relaxed break-keep text-white/40">
              ※ 가격은 부가세 별도이며, 같은 고민을 다시 받을 때는 재구매 가격이 적용돼요.
            </p>
            <p className="font-['Pretendard'] text-[12px] leading-relaxed break-keep text-white/40">
              ※ 배송되는 실물 부적은 이미지 부적과 달라요. 사주와 고민을 보고 그에 맞게 직접 그려서 보내 드려요.
            </p>
          </div>
        </section>

        {/* 고민 진열 — 픽셀 칩 (브랜드 요소 유지) */}
        <section className="w-full max-w-[400px]">
          <h2 className="sb-reveal text-center font-['Mona12'] text-[18px] font-bold tracking-[1.2px] md:text-[20px]">
            어떤 고민이 있나요?
          </h2>
          <div className="sb-reveal mt-6 flex flex-wrap justify-center gap-x-3 gap-y-[14px]" style={{ '--d': 1 } as React.CSSProperties}>
            {TOP_CONCERNS.map((c) => (
              <Link
                key={c}
                href="/saju"
                className="sb-ease rounded-[4px] bg-white px-4 pt-[11px] pb-[10px] font-['Mona12'] text-[14px] tracking-[1.12px] text-[#101010] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:bg-[#ffe9fa] active:translate-y-0"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>

        {/* 리뷰 — 공개 승인분 최신순, 0건이면 숨김 (§6.2 #6) */}
        <HomeReviews />

        {/* FAQ — 네이티브 아코디언, 헤어라인 구분 */}
        <section className="sb-reveal w-full max-w-[400px]">
          <h2 className="font-['Mona12'] text-[18px] font-bold tracking-[1.2px] md:text-[20px]">자주 묻는 질문</h2>
          <div className="mt-4 flex flex-col divide-y divide-white/10 border-y border-white/10">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-['Pretendard'] text-[14px] font-bold break-keep text-white/90">{f.q}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="sb-ease shrink-0 text-white/50 group-open:rotate-45"
                  >
                    <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                  </svg>
                </summary>
                <p className="mt-3 font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/60">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 하단 CTA — 풀블리드 글로우 카드 */}
        <section className="sb-reveal w-full max-w-[400px]">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#141414] px-6 py-12 text-center ring-1 ring-white/10">
            <div
              className="pointer-events-none absolute -top-20 left-1/2 size-[260px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(243,27,192,0.18),transparent_65%)]"
              aria-hidden
            />
            <img src={heart} alt="" className="mx-auto h-10 w-[43px] object-cover" />
            <p className="mt-5 font-['Mona12'] text-[22px] leading-snug font-bold tracking-[1.3px] break-keep">
              부적이 필요한 순간,
              <br />
              소福소福
            </p>
            <p className="mt-3 font-['Pretendard'] text-[13px] leading-relaxed break-keep text-white/55">
              사주 풀이는 무료로 시작해요
            </p>
            <div className="mt-7">
              <CtaButton label="무료로 시작하기" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
