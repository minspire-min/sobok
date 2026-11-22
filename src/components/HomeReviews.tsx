'use client'

import { useEffect, useState } from 'react'
import { listPublicReviews, type ReviewRow } from '../lib/reviewsApi'

// 메인 리뷰 섹션 (PRD §6.2 #6) — 공개 승인된 리뷰 최신순, 0건이면 섹션 자체를 숨긴다
export function HomeReviews() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])

  useEffect(() => {
    listPublicReviews()
      .then(setReviews)
      .catch(() => {})
  }, [])

  if (reviews.length === 0) return null

  return (
    <section className="w-full max-w-[400px]">
      <h2 className="font-['Mona12'] text-[18px] font-bold tracking-[1.2px] md:text-[20px]">먼저 받아 본 이야기</h2>
      <div className="mt-6 flex flex-col gap-4">
        {reviews.map((r, i) => (
          <div
            key={r.id}
            className={`rounded-[1.75rem] bg-white/5 px-5 py-6 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] ${i % 2 === 1 ? 'ml-4' : 'mr-4'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-['Mona12'] text-[14px] tracking-[2px] text-[#f31bc0]">
                {'★'.repeat(r.rating)}
                <span className="text-white/20">{'★'.repeat(5 - r.rating)}</span>
              </span>
              <span className="font-['Pretendard'] text-[12px] text-white/45">{r.nickname}</span>
            </div>
            <p className="mt-3 font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/80">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
